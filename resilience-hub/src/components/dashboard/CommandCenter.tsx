import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { type Alert, type Disaster } from "@/data/mockDisasters";
import { getApiBase } from "@/lib/apiBase";
import { AlertTriangle, Download, ShieldCheck, Timer, Zap } from "lucide-react";

interface Stats {
  activeCount: number;
  totalAffected: number;
  deployedTeams: number;
  monitoringCount: number;
}

interface SimulationResult {
  simulation_id: string;
  simulation_type: string;
  total_casualties: number;
  evacuation_efficiency: number;
  response_time_avg: number;
  recommendations: string[];
}

interface Props {
  disasters: Disaster[];
  alerts: Alert[];
  stats: Stats;
  selected: Disaster | null;
}

function severityValue(d: Disaster): number {
  if (typeof d.magnitude === "number") {
    return Math.max(1, Math.min(10, d.magnitude));
  }
  const map: Record<Disaster["severity"], number> = {
    low: 2,
    moderate: 5,
    high: 7.5,
    critical: 9,
  };
  return map[d.severity];
}

function minutesSince(ts: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
}

function riskScore(d: Disaster): number {
  const sev = severityValue(d) * 9;
  const pop = Math.min(30, Math.log10(Math.max(10, d.affectedPopulation)) * 8);
  const recency = Math.max(0, 20 - Math.floor(minutesSince(d.timestamp) / 30));
  const unresolvedBonus = d.status === "resolved" ? -15 : 12;
  return Math.round(Math.max(0, sev + pop + recency + unresolvedBonus));
}

function priorityLabel(score: number): "P1" | "P2" | "P3" {
  if (score >= 80) return "P1";
  if (score >= 55) return "P2";
  return "P3";
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return `${n}`;
}

function downloadSitrep(markdown: string) {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `SITREP_${new Date().toISOString().replace(/[:.]/g, "-")}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CommandCenter({ disasters, alerts, stats, selected }: Props) {
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  const ranked = useMemo(
    () =>
      [...disasters]
        .map((d) => ({ d, score: riskScore(d) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
    [disasters]
  );

  const slaBreached = useMemo(
    () =>
      disasters.filter(
        (d) =>
          d.status !== "resolved" &&
          minutesSince(d.timestamp) > 120 &&
          (d.severity === "high" || d.severity === "critical")
      ).length,
    [disasters]
  );

  const runSimulation = async () => {
    if (!selected) return;
    setSimError(null);
    setSimLoading(true);
    setSimResult(null);
    try {
      const params = new URLSearchParams({
        disaster_type: selected.type,
        severity: severityValue(selected).toFixed(1),
        population_affected: String(selected.affectedPopulation),
        available_resources: String(Math.max(4, selected.deployedTeams * 2)),
        evacuation_routes: String(Math.max(2, Math.round(selected.deployedTeams / 4))),
        shelters_capacity: String(Math.max(1000, Math.round(selected.affectedPopulation * 0.4))),
        simulation_type: selected.severity === "critical" ? "delayed_evacuation" : "early_evacuation",
      });
      const response = await fetch(`${getApiBase()}/simulation/run?${params.toString()}`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Simulation failed: ${response.status}`);
      }
      const data = (await response.json()) as SimulationResult;
      setSimResult(data);
    } catch (err) {
      setSimError(err instanceof Error ? err.message : "Simulation unavailable");
    } finally {
      setSimLoading(false);
    }
  };

  const exportSitrep = () => {
    const now = new Date().toISOString();
    const top = ranked
      .map(
        ({ d, score }, i) =>
          `${i + 1}. ${d.name} | ${d.location} | Score ${score} | ${priorityLabel(score)} | Status ${d.status.toUpperCase()}`
      )
      .join("\n");

    const latestAlerts = alerts
      .slice(0, 8)
      .map((a, i) => `${i + 1}. [${a.type.toUpperCase()}] ${a.message}`)
      .join("\n");

    const md = `# AEGIS COMMAND - SITREP

Generated: ${now}

## Operational Snapshot
- Active incidents: ${stats.activeCount}
- Population impacted: ${formatNumber(stats.totalAffected)}
- Teams deployed: ${stats.deployedTeams}
- Monitoring incidents: ${stats.monitoringCount}
- SLA breaches (>120m high/critical unresolved): ${slaBreached}

## Priority Queue
${top || "No incidents"}

## Recent Alerts
${latestAlerts || "No alerts"}

## Recommended Actions (Auto)
1. Stabilize top P1 incidents with dual-team dispatch policy.
2. Escalate all SLA-breached incidents to command review.
3. Push evacuation advisories for high-density zones.
4. Rebalance teams from resolved clusters to active critical zones.
`;

    downloadSitrep(md);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 xl:grid-cols-[1.3fr_1fr] gap-3"
    >
      <div className="bg-card border border-border rounded-lg border-glow p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm uppercase tracking-wider font-semibold text-foreground">Command Intelligence</h3>
          <button
            onClick={exportSitrep}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-secondary"
          >
            <Download className="w-3.5 h-3.5" />
            Export SITREP
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className="rounded-md bg-secondary/50 p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Priority P1</p>
            <p className="font-mono text-lg text-danger">{ranked.filter((x) => priorityLabel(x.score) === "P1").length}</p>
          </div>
          <div className="rounded-md bg-secondary/50 p-2">
            <p className="text-[10px] uppercase text-muted-foreground">SLA Breach</p>
            <p className="font-mono text-lg text-accent">{slaBreached}</p>
          </div>
          <div className="rounded-md bg-secondary/50 p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Resolved 24h</p>
            <p className="font-mono text-lg text-success">{disasters.filter((d) => d.status === "resolved").length}</p>
          </div>
          <div className="rounded-md bg-secondary/50 p-2">
            <p className="text-[10px] uppercase text-muted-foreground">Alert Load</p>
            <p className="font-mono text-lg text-primary">{alerts.length}</p>
          </div>
        </div>

        <div className="space-y-1.5 max-h-44 overflow-y-auto">
          {ranked.map(({ d, score }) => (
            <div key={d.id} className="rounded-md bg-secondary/30 px-3 py-2 flex items-center gap-3">
              <div
                className={`h-2.5 w-2.5 rounded-full ${
                  priorityLabel(score) === "P1"
                    ? "bg-danger"
                    : priorityLabel(score) === "P2"
                    ? "bg-accent"
                    : "bg-success"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{d.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{d.location}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-xs">{priorityLabel(score)}</p>
                <p className="font-mono text-[10px] text-muted-foreground">Score {score}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg border-glow p-4">
        <h3 className="text-sm uppercase tracking-wider font-semibold text-foreground mb-3">What-if Simulation</h3>
        <p className="text-xs text-muted-foreground mb-3">
          {selected
            ? `Running impact model for "${selected.name}" based on live dashboard metrics.`
            : "Select an incident from map/list, then run simulation."}
        </p>
        <button
          disabled={!selected || simLoading}
          onClick={runSimulation}
          className="w-full rounded-md border border-primary/50 bg-primary/10 py-2 text-xs font-semibold hover:bg-primary/20 disabled:opacity-50"
        >
          {simLoading ? "Running Simulation..." : "Run 24h Impact Simulation"}
        </button>

        {simError && (
          <div className="mt-3 rounded-md border border-danger/50 bg-danger/10 p-2 text-xs text-danger">
            {simError}
          </div>
        )}

        {simResult && (
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md bg-secondary/50 p-2">
                <p className="text-[10px] text-muted-foreground">Casualties</p>
                <p className="font-mono text-sm">{formatNumber(simResult.total_casualties)}</p>
              </div>
              <div className="rounded-md bg-secondary/50 p-2">
                <p className="text-[10px] text-muted-foreground">Evac Efficiency</p>
                <p className="font-mono text-sm">{simResult.evacuation_efficiency}%</p>
              </div>
              <div className="rounded-md bg-secondary/50 p-2">
                <p className="text-[10px] text-muted-foreground">Avg Response</p>
                <p className="font-mono text-sm">{simResult.response_time_avg}m</p>
              </div>
            </div>
            <div className="rounded-md bg-secondary/30 p-2 space-y-1">
              <p className="text-[10px] uppercase text-muted-foreground">Actionable Recommendations</p>
              {simResult.recommendations.slice(0, 3).map((rec, idx) => (
                <p key={idx} className="text-xs flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 mt-0.5 text-success" />
                  <span>{rec}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Timer className="w-3 h-3" />
            SLA aware
          </span>
          <span className="inline-flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Risk scored
          </span>
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Incident-ready
          </span>
        </div>
      </div>
    </motion.div>
  );
}
