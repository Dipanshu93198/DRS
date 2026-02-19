import { useState, useCallback, useEffect, useRef } from "react";
import { type Disaster, type Alert, mockDisasters, mockAlerts } from "@/data/mockDisasters";
import { fetchUSGSEarthquakes } from "@/services/usgsService";
import { useSimulatedWebSocket } from "@/hooks/useSimulatedWebSocket";

export function useDisasterData() {
  const [disasters, setDisasters] = useState<Disaster[]>(mockDisasters);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [selected, setSelected] = useState<Disaster | null>(null);
  const [usgsLoading, setUsgsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const refreshTimerRef = useRef<ReturnType<typeof setInterval>>();

  // Add new disaster from simulated WebSocket
  const addDisaster = useCallback((d: Disaster) => {
    setDisasters(prev => [d, ...prev]);
  }, []);

  const addAlert = useCallback((a: Alert) => {
    setAlerts(prev => [a, ...prev]);
  }, []);

  // Simulated WebSocket
  const ws = useSimulatedWebSocket(addDisaster, addAlert, 20000);

  // Fetch USGS data
  const refreshUSGS = useCallback(async () => {
    setUsgsLoading(true);
    try {
      const quakes = await fetchUSGSEarthquakes();
      setDisasters(prev => {
        // Remove old USGS entries, keep mock + simulated
        const nonUsgs = prev.filter(d => !d.id.startsWith('usgs-'));
        return [...nonUsgs, ...quakes];
      });
      setLastRefresh(new Date());
    } finally {
      setUsgsLoading(false);
    }
  }, []);

  // Initial USGS fetch + auto-refresh every 5 minutes
  useEffect(() => {
    refreshUSGS();
    refreshTimerRef.current = setInterval(refreshUSGS, 5 * 60 * 1000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [refreshUSGS]);

  const selectById = useCallback((id: string) => {
    setDisasters(prev => {
      const d = prev.find(x => x.id === id);
      if (d) setSelected(d);
      return prev;
    });
  }, []);

  // Stats
  const stats = {
    activeCount: disasters.filter(d => d.status === 'active').length,
    totalAffected: disasters.reduce((s, d) => s + d.affectedPopulation, 0),
    deployedTeams: disasters.reduce((s, d) => s + d.deployedTeams, 0),
    monitoringCount: disasters.filter(d => d.status === 'monitoring').length,
  };

  return {
    disasters,
    alerts,
    selected,
    setSelected,
    selectById,
    stats,
    wsConnected: ws.connected,
    usgsLoading,
    lastRefresh,
    refreshUSGS,
  };
}
