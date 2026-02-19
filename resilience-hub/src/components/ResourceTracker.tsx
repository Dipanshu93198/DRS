import React, { useState,useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, MapPin, Clock, Activity } from 'lucide-react';
import resourceService, { Resource } from '@/services/resourceService';

interface ResourceTrackerProps {
  onSelectResource?: (resource: Resource) => void;
  selectedResource?: Resource | null;
}

export const ResourceTracker: React.FC<ResourceTrackerProps> = ({
  onSelectResource,
  selectedResource,
}) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchResources();
    const interval = setInterval(fetchResources, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [filterStatus, filterType]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const status = filterStatus === 'all' ? undefined : filterStatus;
      const type = filterType === 'all' ? undefined : filterType;
      const data = await resourceService.getResources(status, type);
      setResources(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch resources');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      case 'offline':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ambulance':
        return '🚑';
      case 'drone':
        return '🚁';
      case 'rescue':
        return '👨‍🚒';
      default:
        return '📍';
    }
  };

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Resource Tracker
          </CardTitle>
          <CardDescription>
            {resources.length} resources available
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div>
              <label className="text-sm font-medium">Status:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="mt-1 px-2 py-1 border rounded text-sm"
              >
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Type:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="mt-1 px-2 py-1 border rounded text-sm"
              >
                <option value="all">All</option>
                <option value="ambulance">Ambulance</option>
                <option value="drone">Drone</option>
                <option value="rescue">Rescue</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-100 text-red-800 rounded">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading resources...</div>
          ) : resources.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No resources found</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  onClick={() => onSelectResource?.(resource)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedResource?.id === resource.id
                      ? 'bg-blue-100 border-blue-500'
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getTypeIcon(resource.type)}</span>
                        <span className="font-medium">{resource.name}</span>
                        <Badge className={getStatusColor(resource.status)}>
                          {resource.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {resource.latitude.toFixed(4)}, {resource.longitude.toFixed(4)}
                        </div>
                        {resource.speed > 0 && (
                          <div className="flex items-center gap-2">
                            <Activity className="w-3 h-3" />
                            {resource.speed.toFixed(1)} km/h
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          Updated: {new Date(resource.last_updated).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectResource?.(resource);
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
