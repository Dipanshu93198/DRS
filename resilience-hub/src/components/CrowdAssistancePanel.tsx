import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  MapPin,
  Phone,
  Clock,
  Heart,
  AlertTriangle,
  CheckCircle,
  Loader,
  Award,
} from 'lucide-react';

interface CrowdAssistanceOffer {
  id: number;
  sos_report_id: number;
  helper_name: string;
  helper_phone: string;
  latitude: number;
  longitude: number;
  assistance_type: string;
  description: string;
  distance_km: number;
  estimated_arrival_min: number;
  is_verified: boolean;
  rating?: number;
  offered_at: string;
  accepted_at?: string;
}

interface CrowdAssistancePanelProps {
  sosReportId?: number;
  maxHelpers?: number;
}

export const CrowdAssistancePanel: React.FC<CrowdAssistancePanelProps> = ({
  sosReportId,
  maxHelpers = 5,
}) => {
  const [offers, setOffers] = useState<CrowdAssistanceOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOffer, setExpandedOffer] = useState<number | null>(null);

  useEffect(() => {
    if (sosReportId) {
      fetchOffers();
      // Refresh every 10 seconds
      const interval = setInterval(fetchOffers, 10000);
      return () => clearInterval(interval);
    }
  }, [sosReportId]);

  const fetchOffers = async () => {
    if (!sosReportId) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/sos/assistance/offers/${sosReportId}?available_only=true&limit=${maxHelpers}`);
      if (response.ok) {
        const data = await response.json();
        setOffers(data);
      }
    } catch (error) {
      console.error('Error fetching assistance offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptAssistance = async (offerId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/sos/assistance/${offerId}/accept`, {
        method: 'POST',
      });
      if (response.ok) {
        setOffers(offers.map(o => o.id === offerId ? { ...o, accepted_at: new Date().toISOString() } : o));
      }
    } catch (error) {
      console.error('Error accepting assistance:', error);
    }
  };

  const getAssistanceIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'medical_knowledge': '🏥',
      'transportation': '🚗',
      'shelter': '🏠',
      'supplies': '📦',
      'communication': '📱',
      'physical_help': '💪',
      'other': '🤝',
    };
    return icons[type] || '🤝';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const getRatingStars = (rating?: number) => {
    if (!rating) return '⭐ (Unrated)';
    return '⭐'.repeat(Math.floor(rating)) + ` ${rating.toFixed(1)}`;
  };

  if (!sosReportId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Crowd Assistance
          </CardTitle>
          <CardDescription>Select a SOS report to view available helpers</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center py-8">No SOS report selected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Crowd Assistance
          </CardTitle>
          <CardDescription>Volunteers offering to help (SOS #{sosReportId})</CardDescription>
        </div>
        <div className="text-right">
          <Badge variant="secondary" className="text-base">
            {offers.length} Helpers
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading && offers.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-4 h-4 animate-spin mr-2" />
            Loading helpers...
          </div>
        ) : offers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No volunteers available nearby at this moment</p>
            <p className="text-xs text-gray-400 mt-2">
              Crowd assistance helps mobilize local community support
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {offers.map((offer, index) => (
              <div
                key={offer.id}
                onClick={() => setExpandedOffer(expandedOffer === offer.id ? null : offer.id)}
                className="p-3 border rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
              >
                {/* Header with helper ranking */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <div className="text-2xl">{getAssistanceIcon(offer.assistance_type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{offer.helper_name}</p>
                        {offer.is_verified && (
                          <Award className="w-3 h-3 text-blue-600" title="Verified volunteer" />
                        )}
                        {!offer.accepted_at && index === 0 && (
                          <Badge variant="default" className="text-xs">Closest</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {offer.assistance_type.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={offer.accepted_at ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                      {offer.accepted_at ? '✓ Accepted' : 'Available'}
                    </Badge>
                    <p className="text-xs text-gray-600 text-right">
                      <MapPin className="w-3 h-3 inline mr-1" />
                      {offer.distance_km.toFixed(1)} km • {offer.estimated_arrival_min} min
                    </p>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedOffer === offer.id && (
                  <div className="mt-3 pt-3 border-t space-y-2">
                    {/* Contact & Location */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="font-medium text-gray-600">Contact</p>
                        <p className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {offer.helper_phone}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">Rating</p>
                        <p>{getRatingStars(offer.rating)}</p>
                      </div>
                    </div>

                    {/* Location & Time */}
                    <div className="bg-gray-100 p-2 rounded text-xs space-y-1">
                      <p className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Location: ({offer.latitude.toFixed(4)}, {offer.longitude.toFixed(4)})
                      </p>
                      <p className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Offered: {getTimeAgo(offer.offered_at)} | ETA: {offer.estimated_arrival_min} minutes
                      </p>
                    </div>

                    {/* Help Description */}
                    <div className="bg-blue-50 p-2 rounded text-xs">
                      <p className="font-medium mb-1">What they can offer:</p>
                      <p className="text-gray-700">{offer.description}</p>
                    </div>

                    {/* Verification/Rating Badge */}
                    {offer.is_verified && (
                      <div className="bg-green-50 p-2 rounded text-xs flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Verified volunteer with community background check</span>
                      </div>
                    )}

                    {/* Action Button */}
                    {!offer.accepted_at ? (
                      <Button
                        size="sm"
                        onClick={() => handleAcceptAssistance(offer.id)}
                        className="w-full text-xs"
                      >
                        <Heart className="w-3 h-3 mr-1" />
                        Accept This Helper
                      </Button>
                    ) : (
                      <div className="w-full p-2 bg-green-50 rounded text-center text-xs">
                        <CheckCircle className="w-4 h-4 inline text-green-600 mr-1" />
                        Helper accepted and on the way
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsed Summary */}
                {expandedOffer !== offer.id && (
                  <div className="mt-2 text-xs text-gray-600">
                    <p className="truncate">{offer.description.substring(0, 60)}...</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs">
          <p className="font-medium text-blue-900 mb-1">💡 Crowd Assistance Benefits:</p>
          <ul className="text-blue-800 space-y-1 ml-4 list-disc">
            <li>Immediate local support while official responders arrive</li>
            <li>Vetted volunteers with background checks available</li>
            <li>Local knowledge of area and access paths</li>
            <li>Video verification and real-time location sharing</li>
          </ul>
        </div>

        {/* Safety Notice */}
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
          <p className="flex items-center gap-1 font-medium text-yellow-900">
            <AlertTriangle className="w-4 h-4" />
            Safety First
          </p>
          <p className="text-yellow-800 mt-1">
            Verify volunteer identity before sharing sensitive information. Official responders are always priority.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
