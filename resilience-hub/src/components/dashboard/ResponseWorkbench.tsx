import { useEffect, useMemo, useState } from "react";
import { type Disaster } from "@/data/mockDisasters";
import { type MissionRole } from "@/hooks/useAuth";
import { getApiBase } from "@/lib/apiBase";
import { CheckSquare, ClipboardList, Rocket, Truck } from "lucide-react";

interface DispatchRecommendation {
  resource_id: number;
  resource_name: string;
  resource_type: string;
  distance_km: number;
  estimated_arrival_minutes: number;
  reason: string;
}

interface Props {
  selected: Disaster | null;
  token: string | null;
  missionRole: MissionRole;
}

type ChecklistState = Record<string, Record<string, boolean>>;

function severityToScore(sev: Disaster["severity"], magnitude?: number): number {
  if (typeof magnitude === "number") return Math.max(10, Math.min(100, Math.round(magnitude * 10)));
  if (sev === "critical") return 92;
  if (sev === "high") return 74;
  if (sev === "moderate") return 52;
  return 24;
}

function tasksForDisaster(d: Disaster): string[] {
  const base = [
    "Confirm incident coordinates and geofence",
    "Notify nearest district control room",
    "Broadcast public advisory and route guidance",
  ];
  if (d.severity === "critical" || d.severity === "high") {
    base.push("Activate mass-casualty protocol");
    base.push("Open emergency shelter readiness check");
    base.push("Escalate to inter-agency command bridge");
  } else {
    base.push("Start enhanced monitoring cycle (15 min)");
  }
  return base;
}

export default function ResponseWorkbench({ selected, token, missionRole }: Props) {
  const [busy, setBusy] = useState(false);
  const [dispatchPlan, setDispatchPlan] = useState<DispatchRecommendation | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);
  const [checklistState, setChecklistState] = useState<ChecklistState>({});

  const canOperate = missionRole === "admin" || missionRole === "field";
  const tasks = useMemo(() => (selected ? tasksForDisaster(selected) : []), [selected]);

  useEffect(() => {
    const raw = localStorage.getItem("drs_ops_checklist_v1");
    if (!raw) return;
    try {
      setChecklistState(JSON.parse(raw) as ChecklistState);
    } catch {
      setChecklistState({});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("drs_ops_checklist_v1", JSON.stringify(checklistState));
  }, [checklistState]);

  const toggleTask = (task: string) => {
    if (!selected) return;
    setChecklistState((prev) => {
      const incident = prev[selected.id] ?? {};
      return {
        ...prev,
        [selected.id]: {
          ...incident,
          [task]: !incident[task],
        },
      };
    });
  };

  const seedDemoResources = async () => {
    if (!selected) return;
    setBusy(true);
    setDispatchError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const resources = [
        { name: `Rescue-${Date.now() % 1000}`, type: "rescue", latitude: selected.lat + 0.08, longitude: selected.lng + 0.06, status: "available" },
        { name: `Ambulance-${Date.now() % 1000}`, type: "ambulance", latitude: selected.lat - 0.04, longitude: selected.lng + 0.02, status: "available" },
        { name: `Drone-${Date.now() % 1000}`, type: "drone", latitude: selected.lat + 0.03, longitude: selected.lng - 0.05, status: "available" },
      ];

      await Promise.all(
        resources.map((r) =>
          fetch(`${getApiBase()}/resources/`, {
            method: "POST",
            headers,
            body: JSON.stringify(r),
          })
        )
      );
    } catch {
      setDispatchError("Failed to seed demo resources");
    } finally {
      setBusy(false);
    }
  };

  const runAutoDispatch = async () => {
    if (!selected || !token) return;
    setBusy(true);
    setDispatchError(null);
    setDispatchPlan(null);
    try {
      const body = {
        disaster_lat: selected.lat,
        disaster_lon: selected.lng,
        disaster_type: selected.type,
        severity_score: severityToScore(selected.severity, selected.magnitude),
        resource_type_priority:
          selected.type === "earthquake" || selected.type === "flood"
            ? ["rescue", "ambulance", "drone"]
            : ["ambulance", "rescue", "drone"],
      };

      const response = await fetch(`${getApiBase()}/dispatch/auto`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Dispatch failed" }));
        throw new Error(err.detail || "Dispatch failed");
      }

      const data = (await response.json()) as DispatchRecommendation;
      setDispatchPlan(data);
    } catch (err) {
      setDispatchError(err instanceof Error ? err.message : "Dispatch failed");
    } finally {
      setBusy(false);
    }
  };

  if (!selected) {
    return (
      <div className="bg-card border border-border rounded-lg border-glow p-4">
        <p className="text-sm text-muted-foreground">Select an incident to open Response Workbench.</p>
      </div>
    );
  }

  const currentChecklist = checklistState[selected.id] ?? {};
  const completed = tasks.filter((t) => currentChecklist[t]).length;

  return (
    <div className="bg-card border border-border rounded-lg border-glow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm uppercase tracking-wider font-semibold">Response Workbench</h3>
        <span className="text-[10px] font-mono text-muted-foreground">{selected.name}</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="rounded-md bg-secondary/30 p-3">
          <p className="text-xs font-semibold mb-2 flex items-center gap-2">
            <Truck className="w-3.5 h-3.5" />
            Dispatch Planner
          </p>
          <div className="flex gap-2">
            <button
              onClick={seedDemoResources}
              disabled={busy || !canOperate}
              className="rounded-md border border-border px-2 py-1.5 text-xs hover:bg-secondary disabled:opacity-50"
            >
              Seed Demo Resources
            </button>
            <button
              onClick={runAutoDispatch}
              disabled={busy || !canOperate || !token}
              className="rounded-md border border-primary/50 bg-primary/10 px-2 py-1.5 text-xs hover:bg-primary/20 disabled:opacity-50"
            >
              <Rocket className="w-3.5 h-3.5 inline mr-1" />
              Auto Dispatch
            </button>
          </div>
          {!canOperate && <p className="text-[10px] text-muted-foreground mt-2">Analyst role: dispatch actions blocked.</p>}
          {dispatchError && <p className="text-xs text-danger mt-2">{dispatchError}</p>}
          {dispatchPlan && (
            <div className="mt-2 rounded-md border border-border bg-card p-2 text-xs">
              <p><span className="text-muted-foreground">Resource:</span> {dispatchPlan.resource_name} ({dispatchPlan.resource_type})</p>
              <p><span className="text-muted-foreground">ETA:</span> {dispatchPlan.estimated_arrival_minutes.toFixed(1)} min</p>
              <p><span className="text-muted-foreground">Distance:</span> {dispatchPlan.distance_km.toFixed(2)} km</p>
              <p className="text-muted-foreground mt-1">{dispatchPlan.reason}</p>
            </div>
          )}
        </div>

        <div className="rounded-md bg-secondary/30 p-3">
          <p className="text-xs font-semibold mb-2 flex items-center gap-2">
            <ClipboardList className="w-3.5 h-3.5" />
            Operational Checklist
          </p>
          <p className="text-[10px] text-muted-foreground mb-2">Completed {completed}/{tasks.length}</p>
          <div className="space-y-1.5">
            {tasks.map((task) => (
              <label key={task} className="flex items-start gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(currentChecklist[task])}
                  onChange={() => toggleTask(task)}
                  className="mt-0.5"
                />
                <span className={currentChecklist[task] ? "line-through text-muted-foreground" : ""}>
                  <CheckSquare className="w-3.5 h-3.5 inline mr-1" />
                  {task}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
