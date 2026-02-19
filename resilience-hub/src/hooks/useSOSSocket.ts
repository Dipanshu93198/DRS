"""
useSOSSocket Hook - Real-time SOS alerts via WebSocket
Phase 5: Citizen SOS + Real-Time Alerts
"""

import { useEffect, useState, useCallback, useRef } from 'react';

export interface SOSAlert {
  id: number;
  sos_report_id: number;
  alert_type: 'new_sos' | 'status_update' | 'resource_assigned' | 'resolved';
  message: string;
  broadcast_scope: string;
  latitude: number;
  longitude: number;
  timestamp: string;
}

interface UseSOSSocketOptions {
  url?: string;
  enabled?: boolean;
  onAlert?: (alert: SOSAlert) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

/**
 * Hook for real-time SOS alerts via WebSocket
 *
 * Usage:
 * const { alerts, isConnected, subscribe, unsubscribe } = useSOSSocket({
 *   onAlert: (alert) => console.log('New alert:', alert)
 * });
 */
export const useSOSSocket = (options: UseSOSSocketOptions = {}) => {
  const {
    url = 'ws://localhost:8000/sos/ws',
    enabled = true,
    onAlert,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 3000,
  } = options;

  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (!enabled || isConnecting || isConnected) {
      return;
    }

    setIsConnecting(true);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('SOS WebSocket connected');
        setIsConnected(true);
        setIsConnecting(false);
        onConnect?.();

        // Re-subscribe to any previous subscriptions
        subscriptionsRef.current.forEach((subscription) => {
          ws.send(
            JSON.stringify({
              action: 'subscribe',
              channel: subscription,
            })
          );
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle different message types
          if (data.type === 'alert') {
            const alert: SOSAlert = {
              id: data.id,
              sos_report_id: data.sos_report_id,
              alert_type: data.alert_type,
              message: data.message,
              broadcast_scope: data.broadcast_scope,
              latitude: data.latitude,
              longitude: data.longitude,
              timestamp: data.timestamp || new Date().toISOString(),
            };

            setAlerts((prev) => [alert, ...prev.slice(0, 99)]);
            onAlert?.(alert);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          onError?.(new Error('Failed to parse message'));
        }
      };

      ws.onerror = (error) => {
        console.error('SOS WebSocket error:', error);
        const err = new Error('WebSocket connection error');
        onError?.(err);
      };

      ws.onclose = () => {
        console.log('SOS WebSocket disconnected');
        setIsConnected(false);
        setIsConnecting(false);
        onDisconnect?.();
        webSocketRef.current = null;

        // Attempt to reconnect
        if (autoReconnect && enabled) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      webSocketRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      setIsConnecting(false);

      // Retry connection
      if (autoReconnect && enabled) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    }
  }, [enabled, isConnecting, isConnected, url, onConnect, onDisconnect, onError, autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const subscribe = useCallback(
    (channel: string) => {
      subscriptionsRef.current.add(channel);

      if (webSocketRef.current && isConnected) {
        webSocketRef.current.send(
          JSON.stringify({
            action: 'subscribe',
            channel,
          })
        );
      }
    },
    [isConnected]
  );

  const unsubscribe = useCallback(
    (channel: string) => {
      subscriptionsRef.current.delete(channel);

      if (webSocketRef.current && isConnected) {
        webSocketRef.current.send(
          JSON.stringify({
            action: 'unsubscribe',
            channel,
          })
        );
      }
    },
    [isConnected]
  );

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Connect on mount if enabled
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    alerts,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    clearAlerts,
  };
};

/**
 * Hook for subscribing to nearby SOS alerts
 * Simpler version that auto-subscribes to location-based alerts
 */
export const useNearbySOSAlerts = (
  latitude: number,
  longitude: number,
  radiusKm: number = 5,
  enabled: boolean = true
) => {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);

  const { subscribe, unsubscribe, isConnected } = useSOSSocket({
    enabled,
    onAlert: (alert) => {
      // Check if alert is within radius
      const distance = calculateDistance(latitude, longitude, alert.latitude, alert.longitude);
      if (distance <= radiusKm) {
        setAlerts((prev) => [alert, ...prev.slice(0, 99)]);
      }
    },
  });

  useEffect(() => {
    if (isConnected && enabled) {
      // Subscribe to nearby location channel
      const channel = `location_${latitude.toFixed(2)}_${longitude.toFixed(2)}_${radiusKm}km`;
      subscribe(channel);

      return () => {
        unsubscribe(channel);
      };
    }
  }, [isConnected, enabled, latitude, longitude, radiusKm, subscribe, unsubscribe]);

  return { alerts, isConnected };
};

/**
 * Helper function to calculate distance between two points
 * Using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
