import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Send, MapPin } from 'lucide-react';
import resourceService, { DispatchRecommendation } from '@/services/resourceService';

interface DispatchPanelProps {
  onDispatch?: (recommendation: DispatchRecommendation) => void;
}

const DisasterTypes = [
  { value: 'fire', label: '🔥 Fire' },
  { value: 'flood', label: '🌊 Flood' },
  { value: 'earthquake', label: '🏚️ Earthquake' },
  { value: 'accident', label: '🚗 Accident' },
  { value: 'chemical', label: '⚠️ Chemical Spill' },
  { value: 'medical', label: '🏥 Medical Emergency' },
];

export const DispatchPanel: React.FC<DispatchPanelProps> = ({ onDispatch }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    disaster_lat: '28.7041',
    disaster_lon: '77.1025',
    disaster_type: 'fire',
    severity_score: '75',
    resourceTypes: [] as string[],
  });
  const [recommendation, setRecommendation] = useState<DispatchRecommendation | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleResourceTypeChange = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      resourceTypes: prev.resourceTypes.includes(type)
        ? prev.resourceTypes.filter((t) => t !== type)
        : [...prev.resourceTypes, type],
    }));
  };

  const handleDispatch = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const request = {
        disaster_lat: parseFloat(formData.disaster_lat),
        disaster_lon: parseFloat(formData.disaster_lon),
        disaster_type: formData.disaster_type,
        severity_score: parseFloat(formData.severity_score),
        resource_type_priority: formData.resourceTypes.length > 0 ? formData.resourceTypes : undefined,
      };

      const rec = await resourceService.autoDispatch(request);
      setRecommendation(rec);
      setSuccess(`Resource dispatched: ${rec.resource_name}`);
      onDispatch?.(rec);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to dispatch');
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = async () => {
    try {
      const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (p) => resolve(p.coords),
          reject
        );
      });
      setFormData((prev) => ({
        ...prev,
        disaster_lat: position.latitude.toString(),
        disaster_lon: position.longitude.toString(),
      }));
    } catch (err) {
      setError('Failed to get current location');
    }
  };

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Dispatch Emergency Response
          </CardTitle>
          <CardDescription>
            Send the nearest available resource to the disaster location
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Location Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Latitude</label>
              <Input
                type="number"
                name="disaster_lat"
                value={formData.disaster_lat}
                onChange={handleInputChange}
                placeholder="e.g., 28.7041"
                step="0.0001"
                min="-90"
                max="90"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Longitude</label>
              <Input
                type="number"
                name="disaster_lon"
                value={formData.disaster_lon}
                onChange={handleInputChange}
                placeholder="e.g., 77.1025"
                step="0.0001"
                min="-180"
                max="180"
              />
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={useCurrentLocation}
            className="w-full"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Use Current Location
          </Button>

          {/* Disaster Type */}
          <div>
            <label className="text-sm font-medium">Disaster Type</label>
            <select
              name="disaster_type"
              value={formData.disaster_type}
              onChange={handleInputChange}
              className="w-full mt-1 px-3 py-2 border rounded-lg"
            >
              {DisasterTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Score */}
          <div>
            <label className="text-sm font-medium">
              Severity Score: {formData.severity_score}%
            </label>
            <input
              type="range"
              name="severity_score"
              min="0"
              max="100"
              step="5"
              value={formData.severity_score}
              onChange={handleInputChange}
              className="w-full mt-1"
            />
          </div>

          {/* Resource Type Priority */}
          <div>
            <label className="text-sm font-medium mb-2 block">Resource Priority (optional)</label>
            <div className="space-y-2">
              {['ambulance', 'drone', 'rescue'].map((type) => (
                <label key={type} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.resourceTypes.includes(type)}
                    onChange={() => handleResourceTypeChange(type)}
                    className="rounded"
                  />
                  <span className="capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error & Success Messages */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-100 text-red-800 rounded">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-100 text-green-800 rounded">
              {success}
            </div>
          )}

          {/* Dispatch Button */}
          <Button
            onClick={handleDispatch}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            {loading ? 'Dispatching...' : 'DISPATCH RESOURCE'}
          </Button>

          {/* Recommendation Display */}
          {recommendation && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Dispatch Recommendation</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <p>
                  <strong>Unit:</strong> {recommendation.resource_name}
                </p>
                <p>
                  <strong>Type:</strong> {recommendation.resource_type}
                </p>
                <p>
                  <strong>Distance:</strong> {recommendation.distance_km} km
                </p>
                <p>
                  <strong>ETA:</strong> {recommendation.estimated_arrival_minutes} minutes
                </p>
                <p>
                  <strong>Reason:</strong> {recommendation.reason}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
