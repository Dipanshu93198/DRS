import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Radio, Shield, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface Props {
  wsConnected: boolean;
  usgsLoading: boolean;
  lastRefresh: Date;
  onRefresh: () => void;
}

export default function Header({ wsConnected, usgsLoading, lastRefresh, onRefresh }: Props) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between px-5 py-3 border-b border-border bg-card/80 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <div className="bg-primary/20 p-2 rounded-md glow-primary">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-bold uppercase tracking-widest text-foreground text-glow-primary">
            AEGIS Command
          </h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            AI Disaster Response & Coordination System
          </p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* WebSocket status */}
        <div className="flex items-center gap-2">
          {wsConnected ? (
            <Wifi className="w-3 h-3 text-success" />
          ) : (
            <WifiOff className="w-3 h-3 text-danger" />
          )}
          <span className={`text-[10px] font-mono uppercase ${wsConnected ? 'text-success' : 'text-danger'}`}>
            {wsConnected ? 'WS Connected' : 'WS Disconnected'}
          </span>
        </div>

        {/* USGS refresh */}
        <button
          onClick={onRefresh}
          disabled={usgsLoading}
          className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${usgsLoading ? 'animate-spin' : ''}`} />
          USGS {usgsLoading ? 'Loading...' : `Updated ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        </button>

        {/* System status */}
        <div className="flex items-center gap-2">
          <Radio className="w-3 h-3 text-success animate-pulse" />
          <span className="text-[10px] font-mono text-success uppercase">Online</span>
        </div>

        {/* Live clock */}
        <div className="font-mono text-xs text-muted-foreground tabular-nums">
          {time.toUTCString().slice(0, -4)} UTC
        </div>
      </div>
    </motion.header>
  );
}
