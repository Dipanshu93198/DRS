import { useState, useCallback, useEffect, useRef } from "react";
import { type Disaster, type Alert, mockDisasters, mockAlerts } from "@/data/mockDisasters";
import { fetchUSGSEarthquakes } from "@/services/usgsService";
import { fetchDisasterAlerts, type DisasterAlert } from "@/services/disasterService";
import { fetchLiveBoard } from "@/services/liveBoardService";
import { useSimulatedWebSocket } from "@/hooks/useSimulatedWebSocket";

function normalizeDisasterType(raw: string): Disaster["type"] {
  const key = raw.toLowerCase();
  if (key === "earthquake") return "earthquake";
  if (key === "flood") return "flood";
  if (key === "wildfire") return "wildfire";
  if (key === "cyclone" || key === "hurricane" || key === "tornado") return "cyclone";
  if (key === "tsunami") return "tsunami";
  return "volcano";
}

function normalizeStatus(raw: string): Disaster["status"] {
  const key = raw.toLowerCase();
  if (key === "resolved" || key === "cancelled") return "resolved";
  if (key === "active" || key === "contained") return "active";
  return "monitoring";
}

export function useDisasterData() {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
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

  const updateDisasterStatus = useCallback(
    (id: string, status: Disaster["status"], severity?: Disaster["severity"]) => {
      setDisasters(prev =>
        prev.map(d =>
          d.id === id
            ? {
                ...d,
                status,
                severity: severity ?? d.severity,
                timestamp: new Date().toISOString(),
              }
            : d
        )
      );

      setSelected(prev =>
        prev && prev.id === id
          ? {
              ...prev,
              status,
              severity: severity ?? prev.severity,
              timestamp: new Date().toISOString(),
            }
          : prev
      );

      addAlert({
        id: `action-${id}-${Date.now()}`,
        disasterId: id,
        type: status === "resolved" ? "update" : severity === "critical" ? "critical" : "warning",
        message:
          status === "resolved"
            ? "Incident marked resolved by command center."
            : severity === "critical"
            ? "Incident escalated to CRITICAL and priority routing enabled."
            : `Incident moved to ${status.toUpperCase()} state.`,
        timestamp: new Date().toISOString(),
      });
    },
    [addAlert]
  );

  // Simulated WebSocket
  const ws = useSimulatedWebSocket(addDisaster, addAlert, 20000);

  // Fetch USGS data
  const refreshUSGS = useCallback(async () => {
    setUsgsLoading(true);
    try {
      const [board, quakes] = await Promise.allSettled([fetchLiveBoard(80), fetchUSGSEarthquakes()]);

      const liveDisasters: Disaster[] =
        board.status === "fulfilled"
          ? board.value.incidents.map((i) => ({
              id: i.id,
              type: normalizeDisasterType(i.type),
              name: i.title.slice(0, 90),
              location: i.source?.toUpperCase?.() ?? "DRS",
              lat: i.lat,
              lng: i.lng,
              severity: i.severity,
              affectedPopulation: i.affected_population ?? 0,
              deployedTeams: i.severity === "critical" ? 24 : i.severity === "high" ? 14 : 6,
              timestamp: i.timestamp,
              description: i.title,
              status: normalizeStatus(i.status),
            }))
          : [];

      const usgsDisasters: Disaster[] = quakes.status === "fulfilled" ? quakes.value : [];

      const merged = [...liveDisasters, ...usgsDisasters];
      if (merged.length > 0) {
        setDisasters(merged);
      } else {
        setDisasters(mockDisasters);
        setAlerts(mockAlerts);
      }
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
    updateDisasterStatus,
    stats,
    wsConnected: ws.connected,
    usgsLoading,
    alertsLoading,
    lastRefresh,
    refreshUSGS,
    refreshAlerts,
  };
}
