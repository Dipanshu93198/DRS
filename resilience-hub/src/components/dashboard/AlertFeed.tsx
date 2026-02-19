import { motion } from "framer-motion";
import { type Alert } from "@/data/mockDisasters";
import { AlertTriangle, Info, Bell, RefreshCw } from "lucide-react";

const typeConfig = {
  critical: { icon: AlertTriangle, className: "text-danger animate-blink" },
  warning: { icon: Bell, className: "text-accent" },
  update: { icon: RefreshCw, className: "text-primary" },
  info: { icon: Info, className: "text-muted-foreground" },
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

interface Props {
  alerts: Alert[];
  onSelectDisaster: (id: string) => void;
}

export default function AlertFeed({ alerts, onSelectDisaster }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg border-glow flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Bell className="w-4 h-4 text-accent" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Live Alerts</h2>
        <span className="ml-auto font-mono text-xs text-danger animate-blink">● LIVE</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {alerts.slice(0, 20).map((alert, i) => {
          const config = typeConfig[alert.type];
          const Icon = config.icon;
          return (
            <motion.button
              key={alert.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i < 8 ? i * 0.05 : 0 }}
              layout
              onClick={() => onSelectDisaster(alert.disasterId)}
              className="w-full text-left p-3 rounded-md bg-secondary/50 hover:bg-secondary transition-colors flex gap-3 items-start"
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.className}`} />
              <div className="min-w-0">
                <p className="text-xs text-foreground leading-relaxed">{alert.message}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">{timeAgo(alert.timestamp)}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
