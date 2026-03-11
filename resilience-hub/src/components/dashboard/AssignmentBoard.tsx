import { type Disaster } from "@/data/mockDisasters";
import { type MissionRole } from "@/hooks/useAuth";
import { Clock3, UserCog } from "lucide-react";

export interface Assignment {
  disasterId: string;
  owner: string;
  status: "queued" | "assigned" | "enroute" | "onsite" | "resolved";
  etaMinutes: number;
  slaMinutes: number;
  notes?: string;
  lastUpdated: string;
}

interface Props {
  role: MissionRole;
  disasters: Disaster[];
  assignments: Record<string, Assignment>;
  onUpdate: (id: string, patch: Partial<Assignment>) => void;
}

function minutesSince(ts: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
}

export default function AssignmentBoard({ role, disasters, assignments, onUpdate }: Props) {
  const readOnly = role === "analyst";
  const active = disasters.filter((d) => d.status !== "resolved").slice(0, 8);

  return (
    <div className="bg-card border border-border rounded-lg border-glow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm uppercase tracking-wider font-semibold">Incident Assignment Board</h3>
        <span className="text-[10px] font-mono text-muted-foreground">{readOnly ? "READ ONLY" : "LIVE OPS"}</span>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {active.map((d) => {
          const row = assignments[d.id];
          const breached = minutesSince(d.timestamp) > row.slaMinutes && d.status !== "resolved";
          return (
            <div key={d.id} className="rounded-md bg-secondary/40 p-2 grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 md:col-span-4">
                <p className="text-xs font-semibold truncate">{d.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{d.location}</p>
              </div>
              <div className="col-span-4 md:col-span-3">
                <label className="text-[10px] text-muted-foreground">Owner</label>
                <input
                  value={row.owner}
                  onChange={(e) => onUpdate(d.id, { owner: e.target.value })}
                  disabled={readOnly}
                  className="mt-1 w-full h-8 rounded border border-border bg-card px-2 text-xs disabled:opacity-60"
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="text-[10px] text-muted-foreground">Status</label>
                <select
                  value={row.status}
                  onChange={(e) => onUpdate(d.id, { status: e.target.value as Assignment["status"] })}
                  disabled={readOnly}
                  className="mt-1 w-full h-8 rounded border border-border bg-card px-2 text-xs disabled:opacity-60"
                >
                  <option value="queued">Queued</option>
                  <option value="assigned">Assigned</option>
                  <option value="enroute">Enroute</option>
                  <option value="onsite">Onsite</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="text-[10px] text-muted-foreground">ETA</label>
                <input
                  type="number"
                  min={0}
                  value={row.etaMinutes}
                  onChange={(e) => onUpdate(d.id, { etaMinutes: Number(e.target.value || 0) })}
                  disabled={readOnly}
                  className="mt-1 w-full h-8 rounded border border-border bg-card px-2 text-xs disabled:opacity-60"
                />
              </div>
              <div className="col-span-2 md:col-span-2 text-right">
                <p className={`text-[10px] font-mono ${breached ? "text-danger" : "text-success"}`}>
                  {breached ? "SLA BREACH" : "SLA OK"}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  <Clock3 className="w-3 h-3 inline mr-1" />
                  {row.slaMinutes}m
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 text-[10px] text-muted-foreground">
        <UserCog className="w-3 h-3 inline mr-1" />
        Assignments auto-persist in session for rapid command handover.
      </div>
    </div>
  );
}
