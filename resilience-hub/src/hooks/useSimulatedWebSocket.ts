import { useEffect, useRef, useCallback, useState } from "react";
import { type Disaster, type Alert, DISASTER_ICONS } from "@/data/mockDisasters";
import { toast } from "sonner";

const SIMULATED_EVENTS: Array<{ disaster: Omit<Disaster, 'id' | 'timestamp'>; alert: string }> = [
  {
    disaster: {
      type: 'earthquake', name: 'Aegean Sea Tremor', location: 'Izmir, Turkey',
      lat: 38.42, lng: 27.14, severity: 'moderate', magnitude: 5.1,
      affectedPopulation: 42000, deployedTeams: 12,
      description: 'Moderate earthquake detected in the Aegean Sea. Coastal monitoring active.',
      status: 'monitoring',
    },
    alert: 'New seismic activity detected near Izmir, Turkey. M5.1.',
  },
  {
    disaster: {
      type: 'flood', name: 'Rhine River Surge', location: 'Cologne, Germany',
      lat: 50.94, lng: 6.96, severity: 'high',
      affectedPopulation: 95000, deployedTeams: 28,
      description: 'Rhine river levels exceed critical threshold. Flooding imminent in low-lying areas.',
      status: 'active',
    },
    alert: 'Rhine river at critical level. Flood warning issued for Cologne metropolitan area.',
  },
  {
    disaster: {
      type: 'wildfire', name: 'Algarve Coast Fire', location: 'Faro, Portugal',
      lat: 37.02, lng: -7.93, severity: 'high',
      affectedPopulation: 18000, deployedTeams: 16,
      description: 'Fast-moving wildfire in southern Portugal. Tourist areas being evacuated.',
      status: 'active',
    },
    alert: 'Wildfire spreading rapidly in Algarve region. Aerial firefighting deployed.',
  },
  {
    disaster: {
      type: 'cyclone', name: 'Tropical Storm Beta', location: 'Caribbean Sea',
      lat: 16.5, lng: -65.0, severity: 'moderate',
      affectedPopulation: 120000, deployedTeams: 20,
      description: 'Tropical storm forming in the Caribbean. Potential to intensify within 48 hours.',
      status: 'monitoring',
    },
    alert: 'Tropical Storm Beta forming. Caribbean islands on standby alert.',
  },
  {
    disaster: {
      type: 'volcano', name: 'Etna Flank Eruption', location: 'Sicily, Italy',
      lat: 37.75, lng: 14.99, severity: 'moderate',
      affectedPopulation: 32000, deployedTeams: 10,
      description: 'New fissure eruption on SE flank. Lava flow moving slowly toward inhabited zone.',
      status: 'active',
    },
    alert: 'Mount Etna eruption intensifying. New lava flow detected on southeast flank.',
  },
];

let counter = 0;

export function useSimulatedWebSocket(
  onNewDisaster: (d: Disaster) => void,
  onNewAlert: (a: Alert) => void,
  intervalMs: number = 15000,
) {
  const [connected, setConnected] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const start = useCallback(() => {
    setConnected(true);
    timerRef.current = setInterval(() => {
      const idx = counter % SIMULATED_EVENTS.length;
      counter++;
      const event = SIMULATED_EVENTS[idx];
      const now = new Date().toISOString();
      const id = `sim-${Date.now()}`;

      const disaster: Disaster = {
        ...event.disaster,
        id,
        timestamp: now,
      };

      const alert: Alert = {
        id: `alert-${Date.now()}`,
        disasterId: id,
        type: disaster.severity === 'critical' ? 'critical' : disaster.severity === 'high' ? 'warning' : 'info',
        message: event.alert,
        timestamp: now,
      };

      onNewDisaster(disaster);
      onNewAlert(alert);

      // Toast notification
      const icon = DISASTER_ICONS[disaster.type];
      toast(`${icon} ${disaster.name}`, {
        description: event.alert,
        duration: 5000,
      });
    }, intervalMs);
  }, [onNewDisaster, onNewAlert, intervalMs]);

  const stop = useCallback(() => {
    setConnected(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  return { connected, start, stop };
}
