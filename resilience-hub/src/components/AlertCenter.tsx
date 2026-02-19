import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  MapPin,
  Clock,
  Users,
  Zap,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface SOSReport {
  id: number;
  reporter_name: string;
  reporter_phone: string;
  latitude: number;
  longitude: number;
  emergency_type: string;
  description: string;
  severity_score: number;
  status: string;
  num_people_affected: number;
  has_injuries: number;
  requires_evacuation: number;
  is_urgent: boolean;
  reported_at: string;
  acknowledged_at?: string;
}

interface AlertCenterProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxAlerts?: number;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({
  autoRefresh = true,
  refreshInterval = 5000,
  maxAlerts = 10,
}) => {
  const [alerts, setAlerts] = useState<SOSReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<number | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/sos/reports/active?limit=' + maxAlerts);
      if (response.ok) {
        const data = await response.json();
        setAlerts(data);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    if (autoRefresh) {
      const interval = setInterval(fetchAlerts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, maxAlerts]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-red-100 text-red-800';
      case 'acknowledged':
        return 'bg-orange-100 text-orange-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (score: number) => {
    if (score >= 8) return 'destructive';
    if (score >= 6) return 'default';
    if (score >= 4) return 'secondary';
    return 'outline';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertTriangle className="w-4 h-4" />;
      case 'acknowledged':
        return <Zap className="w-4 h-4" />;
      case 'in_progress':
        return <AlertCircle className="w-4 h-4" />;
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getEmergencyIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      medical: '🏥',
      accident: '🚗',
      fire: '🔥',
      flooding: '🌊',
      trapped: '🪚',
      missing: '👤',
      other: '⚠️',
    };
    return icons[type] || '⚠️';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const handleAcknowledge = async (sosId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/sos/report/${sosId}/acknowledge`, {
        method: 'POST',
      });
      if (response.ok) {
        setAlerts(alerts.map(a => a.id === sosId ? { ...a, status: 'acknowledged', acknowledged_at: new Date().toISOString() } : a));
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            Alert Center
          </CardTitle>
          <CardDescription>Real-time emergency alerts</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{alerts.length} Active</Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchAlerts}
            disabled={loading}
            className="w-10 h-10 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No active emergencies at this time</p>
            {lastRefresh && (
              <p className="text-xs text-gray-400 mt-2">
                Last checked: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(selectedAlert === alert.id ? null : alert.id)}
                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-2xl">{getEmergencyIcon(alert.emergency_type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {alert.emergency_type.toUpperCase()} at ({alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)})
                      </p>
                      <p className="text-xs text-gray-600 truncate">{alert.description.substring(0, 50)}...</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={getSeverityColor(alert.severity_score)}>
                      {alert.severity_score.toFixed(1)}/10
                    </Badge>
                    <Badge className={`text-xs ${getStatusColor(alert.status)}`}>
                      {alert.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedAlert === alert.id && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {/* Reporter Info */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="font-medium text-gray-600">Reporter</p>
                        <p>{alert.reporter_name}</p>
                        <p className="text-gray-600">{alert.reporter_phone}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">Impact</p>
                        <p>{alert.num_people_affected} people affected</p>
                        <p>{alert.has_injuries} injured</p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-1 text-xs">
                      <p className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        Location: {alert.latitude.toFixed(6)}, {alert.longitude.toFixed(6)}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        Reported: {getTimeAgo(alert.reported_at)}
                      </p>
                      {alert.acknowledged_at && (
                        <p className="flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          Acknowledged: {getTimeAgo(alert.acknowledged_at)}
                        </p>
                      )}
                    </div>

                    {/* Full Description */}
                    <div className="bg-gray-100 p-2 rounded text-xs max-h-20 overflow-y-auto">
                      <p className="font-medium mb-1">Full Description:</p>
                      <p className="text-gray-700">{alert.description}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {alert.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleAcknowledge(alert.id)}
                          className="col-span-2 text-xs"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Acknowledge SOS
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        📍 View Map
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        👥 Crowd Help
                      </Button>
                    </div>
                  </div>
                )}

                {/* Summary Row (when collapsed) */}
                {selectedAlert !== alert.id && (
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {alert.num_people_affected} affected
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(alert.reported_at)}
                      </div>
                    </div>
                    {alert.is_urgent && (
                      <Badge variant="destructive" className="text-xs">
                        🚨 URGENT
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {lastRefresh && (
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            Last refreshed: {lastRefresh.toLocaleTimeString()}
            {autoRefresh && ' (auto-refresh enabled)'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
