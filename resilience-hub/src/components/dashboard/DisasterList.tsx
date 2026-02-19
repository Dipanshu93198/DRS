import { motion } from "framer-motion";
import { DISASTER_ICONS, type Disaster } from "@/data/mockDisasters";

const sevClasses: Record<string, string> = {
  low: "border-l-success",
  moderate: "border-l-warning",
  high: "border-l-accent",
  critical: "border-l-danger",
};

function formatPop(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toString();
}

interface Props {
  disasters: Disaster[];
  onSelect: (d: Disaster) => void;
  selectedId: string | null;
}

export default function DisasterList({ disasters, onSelect, selectedId }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg border-glow flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">Active Events</h2>
        <span className="font-mono text-[10px] text-muted-foreground">{disasters.length} total</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {disasters.map((d, i) => (
          <motion.button
            key={d.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i < 10 ? i * 0.03 : 0 }}
            layout
            onClick={() => onSelect(d)}
            className={`w-full text-left p-3 rounded-md border-l-2 transition-colors flex gap-3 items-center ${sevClasses[d.severity]} ${
              selectedId === d.id ? 'bg-secondary' : 'bg-secondary/30 hover:bg-secondary/60'
            }`}
          >
            <span className="text-lg">{DISASTER_ICONS[d.type]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{d.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{d.location}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono text-xs font-bold text-foreground">{formatPop(d.affectedPopulation)}</p>
              <p className="text-[10px] text-muted-foreground">affected</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
