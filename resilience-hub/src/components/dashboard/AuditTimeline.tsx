import { type MissionRole } from "@/hooks/useAuth";
import { History } from "lucide-react";

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  severity: "info" | "warning" | "critical";
  timestamp: string;
  details?: string;
}

interface Props {
  role: MissionRole;
  events: AuditEvent[];
}

function severityClass(level: AuditEvent["severity"]): string {
  if (level === "critical") return "text-danger";
  if (level === "warning") return "text-accent";
  return "text-primary";
}

export default function AuditTimeline({ role, events }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg border-glow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm uppercase tracking-wider font-semibold">Operational Audit Trail</h3>
        <span className="text-[10px] font-mono text-muted-foreground">{role.toUpperCase()} VIEW</span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {events.slice(0, 30).map((e) => (
          <div key={e.id} className="rounded-md bg-secondary/30 p-2">
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold ${severityClass(e.severity)}`}>{e.action}</p>
              <span className="text-[10px] font-mono text-muted-foreground">
                {new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-[11px] text-foreground">{e.target}</p>
            <p className="text-[10px] text-muted-foreground">
              <History className="w-3 h-3 inline mr-1" />
              {e.actor} {e.details ? `• ${e.details}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
