import { motion, AnimatePresence } from "framer-motion";
import { type Disaster, DISASTER_ICONS, SEVERITY_COLORS } from "@/data/mockDisasters";
import { X, MapPin, Users, Shield, Clock } from "lucide-react";

const severityBadge: Record<string, string> = {
  low: "bg-success/20 text-success",
  moderate: "bg-warning/20 text-warning",
  high: "bg-accent/20 text-accent",
  critical: "bg-danger/20 text-danger",
};

function formatPop(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toString();
}

interface Props {
  disaster: Disaster | null;
  onClose: () => void;
}

export default function DisasterDetail({ disaster, onClose }: Props) {
  return (
    <AnimatePresence>
      {disaster && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="absolute bottom-4 left-4 right-4 z-[600] bg-card/95 backdrop-blur-md border border-border rounded-lg border-glow p-5 max-w-lg"
        >
          <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-start gap-3 mb-4">
            <span className="text-3xl">{DISASTER_ICONS[disaster.type]}</span>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{disaster.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{disaster.location}</span>
                <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${severityBadge[disaster.severity]}`}>
                  {disaster.severity}
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-secondary-foreground mb-4 leading-relaxed">{disaster.description}</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary rounded-md p-3 text-center">
              <Users className="w-4 h-4 mx-auto mb-1 text-accent" />
              <p className="font-mono text-lg font-bold text-foreground">{formatPop(disaster.affectedPopulation)}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Affected</p>
            </div>
            <div className="bg-secondary rounded-md p-3 text-center">
              <Shield className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="font-mono text-lg font-bold text-foreground">{disaster.deployedTeams}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Teams</p>
            </div>
            <div className="bg-secondary rounded-md p-3 text-center">
              <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="font-mono text-sm font-bold text-foreground">
                {new Date(disaster.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase">Reported</p>
            </div>
          </div>

          {disaster.magnitude && (
            <div className="mt-3 text-center">
              <span className="font-mono text-xs text-muted-foreground">Magnitude: </span>
              <span className="font-mono text-sm font-bold text-accent">{disaster.magnitude}</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
