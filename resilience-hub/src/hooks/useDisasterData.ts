import { useState, useCallback, useEffect, useRef } from "react";
import { type Disaster, type Alert, mockDisasters, mockAlerts } from "@/data/mockDisasters";
import { fetchUSGSEarthquakes } from "@/services/usgsService";
import { fetchDisasterAlerts, type DisasterAlert } from "@/services/disasterService";
import { useSimulatedWebSocket } from "@/hooks/useSimulatedWebSocket";

export function useDisasterData() {
  const [disasters, setDisasters] = useState<Disaster[]>(mockDisasters);
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [disasterAlerts, setDisasterAlerts] = useState<DisasterAlert[]>([]);
  const [selected, setSelected] = useState<Disaster | null>(null);
  const [usgsLoading, setUsgsLoading] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
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

  // Fetch disaster alerts (weather, floods, wildfires)
  const refreshAlerts = useCallback(async () => {
    setAlertsLoading(true);
    try {
      // Use a default location or get from map center - for now using a sample location
      const sampleLat = 37.7749; // San Francisco
      const sampleLon = -122.4194;
      const alertsData = await fetchDisasterAlerts(sampleLat, sampleLon);

      // Convert DisasterAlert to Alert format for compatibility with AlertFeed
      const convertedAlerts: Alert[] = alertsData.alerts.map((alert, index) => ({
        id: `disaster-alert-${index}`,
        disasterId: `external-${alert.source}-${index}`, // Use source as part of ID
        type: alert.severity === 'high' || alert.severity === 'critical' ? 'critical' :
              alert.severity === 'moderate' ? 'warning' : 'info',
        message: `${alert.title}: ${alert.description}`,
        timestamp: alert.timestamp,
      }));

      setDisasterAlerts(alertsData.alerts);
      // Merge with existing alerts
      setAlerts(prev => [...convertedAlerts, ...prev.filter(a => !a.id.startsWith('disaster-alert-'))]);
    } catch (error) {
      console.error('Failed to fetch disaster alerts:', error);
    } finally {
      setAlertsLoading(false);
    }
  }, []);

  // Initial USGS fetch + auto-refresh every 5 minutes
  useEffect(() => {
    refreshUSGS();
    refreshAlerts();
    refreshTimerRef.current = setInterval(() => {
      refreshUSGS();
      refreshAlerts();
    }, 5 * 60 * 1000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [refreshUSGS, refreshAlerts]);

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
    disasterAlerts,
    selected,
    setSelected,
    selectById,
    stats,
    wsConnected: ws.connected,
    usgsLoading,
    alertsLoading,
    lastRefresh,
    refreshUSGS,
    refreshAlerts,
  };
}
