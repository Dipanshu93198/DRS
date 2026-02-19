import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Phone,
  MapPin,
  Users,
  Activity,
  AlertCircle,
  Send,
  Loader,
  CheckCircle,
} from 'lucide-react';

interface SOSReportPanelProps {
  onReportSubmitted?: (sosId: number) => void;
  currentLocation?: { latitude: number; longitude: number };
}

interface FormData {
  reporter_name: string;
  reporter_phone: string;
  reporter_email: string;
  emergency_type: string;
  description: string;
  severity_score: number;
  num_people_affected: number;
  has_injuries: number;
  requires_evacuation: number;
  is_urgent: boolean;
  crowd_assistance_enabled: boolean;
  latitude: number;
  longitude: number;
}

export const SOSReportPanel: React.FC<SOSReportPanelProps> = ({
  onReportSubmitted,
  currentLocation,
}) => {
  const [step, setStep] = useState<'form' | 'preview' | 'submitted'>('form');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<{ id: number; timestamp: Date } | null>(null);
  const [formData, setFormData] = useState<FormData>({
    reporter_name: '',
    reporter_phone: '',
    reporter_email: '',
    emergency_type: 'medical',
    description: '',
    severity_score: 5,
    num_people_affected: 1,
    has_injuries: 0,
    requires_evacuation: 0,
    is_urgent: false,
    crowd_assistance_enabled: true,
    latitude: currentLocation?.latitude || 0,
    longitude: currentLocation?.longitude || 0,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : type === 'number' ? parseFloat(value) : value,
    }));
  };

  const getSeverityColor = (score: number) => {
    if (score >= 8) return 'destructive';
    if (score >= 6) return 'default';
    if (score >= 4) return 'secondary';
    return 'outline';
  };

  const emergencyTypes = [
    { value: 'medical', label: '🏥 Medical Emergency' },
    { value: 'accident', label: '🚗 Accident' },
    { value: 'fire', label: '🔥 Fire' },
    { value: 'flooding', label: '🌊 Flooding' },
    { value: 'trapped', label: '🪚 Trapped' },
    { value: 'missing', label: '👤 Missing Person' },
    { value: 'other', label: '⚠️ Other Emergency' },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/sos/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          latitude: currentLocation?.latitude || formData.latitude,
          longitude: currentLocation?.longitude || formData.longitude,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubmitted({ id: data.id, timestamp: new Date() });
        setStep('submitted');
        onReportSubmitted?.(data.id);
      } else {
        alert('Failed to submit SOS report');
      }
    } catch (error) {
      console.error('Error submitting SOS:', error);
      alert('Error submitting SOS report');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'submitted' && submitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            SOS Report Submitted
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-white rounded border border-green-200">
            <p className="text-sm font-medium">Report ID: <code className="bg-gray-100 px-2 py-1 rounded">{submitted.id}</code></p>
            <p className="text-sm text-gray-600 mt-2">
              Your emergency report has been transmitted to emergency services.
            </p>
            <p className="text-sm text-gray-600">
              Submitted at: {submitted.timestamp.toLocaleTimeString()}
            </p>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm font-medium text-blue-900">What happens next:</p>
            <ul className="text-xs text-blue-800 mt-2 space-y-1 ml-4 list-disc">
              <li>Emergency responders are being notified</li>
              <li>Nearby volunteers may offer assistance</li>
              <li>Your location is shared with authorized responders only</li>
              <li>You'll receive updates as resources respond</li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => {
                setStep('form');
                setSubmitted(null);
              }}
              variant="outline"
              className="w-full"
            >
              Report Another Emergency
            </Button>
            <Button
              onClick={() => {
                // In real app, would navigate to report tracking
                alert(`Tracking SOS #${submitted.id}`);
              }}
              className="w-full"
            >
              Track This Report
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          Emergency SOS Report
        </CardTitle>
        <CardDescription>Report an emergency situation requiring immediate assistance</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Reporter Info Section */}
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Your Information
          </h3>
          <input
            type="text"
            name="reporter_name"
            placeholder="Full Name (required)"
            value={formData.reporter_name}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
          <input
            type="tel"
            name="reporter_phone"
            placeholder="Phone Number (required)"
            value={formData.reporter_phone}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
          <input
            type="email"
            name="reporter_email"
            placeholder="Email (optional)"
            value={formData.reporter_email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>

        {/* Location Section */}
        <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Emergency Location
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-600">Latitude</label>
              <input
                type="number"
                name="latitude"
                placeholder="Latitude"
                value={formData.latitude}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md text-sm"
                disabled={!!currentLocation}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Longitude</label>
              <input
                type="number"
                name="longitude"
                placeholder="Longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded-md text-sm"
                disabled={!!currentLocation}
              />
            </div>
          </div>
          {currentLocation && (
            <p className="text-xs text-blue-700">
              ✓ Using your current location
            </p>
          )}
        </div>

        {/* Emergency Type Section */}
        <div className="space-y-3 p-4 bg-red-50 rounded-lg">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Emergency Type
          </h3>
          <select
            name="emergency_type"
            value={formData.emergency_type}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border rounded-md text-sm"
          >
            {emergencyTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Detailed Description (min 10 characters)</label>
          <textarea
            name="description"
            placeholder="Describe the emergency situation in detail. Include any relevant information..."
            value={formData.description}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border rounded-md text-sm"
          />
        </div>

        {/* Severity & Impact */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-lg">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Severity Level
              <Badge variant={getSeverityColor(formData.severity_score)}>
                {formData.severity_score}/10
              </Badge>
            </label>
            <input
              type="range"
              name="severity_score"
              min="0"
              max="10"
              step="0.5"
              value={formData.severity_score}
              onChange={handleInputChange}
              className="w-full"
            />
            <p className="text-xs text-gray-600">0 = Minor, 10 = Life-threatening</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">People Affected</label>
            <input
              type="number"
              name="num_people_affected"
              min="1"
              value={formData.num_people_affected}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
        </div>

        {/* Injuries & Evacuation */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 rounded-lg">
          <div className="space-y-2">
            <label className="text-sm font-medium">People with Injuries</label>
            <input
              type="number"
              name="has_injuries"
              min="0"
              value={formData.has_injuries}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Needing Evacuation</label>
            <input
              type="number"
              name="requires_evacuation"
              min="0"
              value={formData.requires_evacuation}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2 p-4 bg-purple-50 rounded-lg">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_urgent"
              checked={formData.is_urgent}
              onChange={handleInputChange}
              className="w-4 h-4"
            />
            <span>
              <strong>URGENT</strong> - This is life-threatening
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="crowd_assistance_enabled"
              checked={formData.crowd_assistance_enabled}
              onChange={handleInputChange}
              className="w-4 h-4"
            />
            <span>Allow nearby volunteers to help</span>
          </label>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={() => setStep('preview')}
            variant="outline"
            className="flex-1"
            disabled={!formData.reporter_name || !formData.reporter_phone || formData.description.length < 10}
          >
            Review &amp; Confirm
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.reporter_name || !formData.reporter_phone || formData.description.length < 10}
            className="flex-1 bg-red-600 hover:bg-red-700"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit SOS Now
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
