import { motion } from "framer-motion";
import { Activity, Users, Shield, AlertTriangle } from "lucide-react";

interface Stats {
  activeCount: number;
  totalAffected: number;
  deployedTeams: number;
  monitoringCount: number;
}

const variantStyles = {
  danger: "text-danger glow-danger",
  accent: "text-accent glow-accent",
  primary: "text-primary glow-primary",
  success: "text-success",
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toString();
}

export default function StatsBar({ stats }: { stats: Stats }) {
  const items = [
    { label: "Active Disasters", value: stats.activeCount, icon: AlertTriangle, variant: "danger" as const },
    { label: "Affected Population", value: stats.totalAffected, icon: Users, variant: "accent" as const },
    { label: "Deployed Teams", value: stats.deployedTeams, icon: Shield, variant: "primary" as const },
    { label: "Monitoring", value: stats.monitoringCount, icon: Activity, variant: "success" as const },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-card border border-border rounded-lg p-4 border-glow"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md bg-secondary ${variantStyles[stat.variant]}`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wider">{stat.label}</p>
              <p className={`font-mono text-2xl font-bold ${variantStyles[stat.variant]}`}>
                {formatNumber(stat.value)}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
