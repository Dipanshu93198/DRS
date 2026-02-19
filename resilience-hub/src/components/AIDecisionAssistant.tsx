import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Users,
  Lightbulb,
  MapPin,
  Clock,
  Zap,
  Shield,
  Loader,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface DisasterInfo {
  disaster_type: string;
  severity_score: number;
  latitude: number;
  longitude: number;
  context?: string;
}

interface Resource {
  id: number;
  name: string;
  type: string;
  distance_km: number;
}

interface QuickActionResult {
  title: string;
  content: string;
  timestamp: Date;
}

interface ValidationResult {
  is_valid: boolean;
  validation_score: number;
  reason: string;
  severity_level: string;
  recommended_actions: string[];
  validation_details: Record<string, any>;
}

interface AIDecisionAssistantProps {
  disasterInfo?: DisasterInfo;
  availableResources?: Resource[];
  onActionComplete?: (result: QuickActionResult) => void;
}

export const AIDecisionAssistant: React.FC<AIDecisionAssistantProps> = ({
  disasterInfo,
  availableResources = [],
  onActionComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [results, setResults] = useState<QuickActionResult[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  if (!disasterInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            AI Decision Assistant
          </CardTitle>
          <CardDescription>Select a disaster to get recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">No disaster selected</p>
        </CardContent>
      </Card>
    );
  }

  const handleExplain = async () => {
    setLoadingAction('explain');
    try {
      const response = await fetch('http://localhost:8000/ai/explain-disaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disaster_type: disasterInfo.disaster_type,
          latitude: disasterInfo.latitude,
          longitude: disasterInfo.longitude,
          severity_score: disasterInfo.severity_score,
          context: disasterInfo.context,
        }),
      });

      const data = await response.json();
      const result: QuickActionResult = {
        title: `${disasterInfo.disaster_type.toUpperCase()} Explanation`,
        content: data.explanation,
        timestamp: new Date(),
      };
      setResults((prev) => [result, ...prev]);
      onActionComplete?.(result);
    } catch (error) {
      console.error('Error explaining disaster:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRecommend = async () => {
    setLoadingAction('recommend');
    try {
      const response = await fetch('http://localhost:8000/ai/prioritize-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disaster_type: disasterInfo.disaster_type,
          severity_score: disasterInfo.severity_score,
          available_resources: availableResources,
        }),
      });

      const data = await response.json();
      const priorityText = data.priorities
        .map(
          (p: any) =>
            `${p.rank}. ${p.resource_name} (${p.resource_type})\n   ${p.reasoning}\n   ETA: ${p.estimated_arrival_minutes.toFixed(0)} min`
        )
        .join('\n\n');

      const result: QuickActionResult = {
        title: 'Resource Prioritization',
        content: `Strategy: ${data.overall_strategy}\n\n${priorityText}\n\nAdequacy: ${data.resource_adequacy}`,
        timestamp: new Date(),
      };
      setResults((prev) => [result, ...prev]);
      onActionComplete?.(result);
    } catch (error) {
      console.error('Error getting recommendations:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSafety = async () => {
    setLoadingAction('safety');
    try {
      const response = await fetch('http://localhost:8000/ai/safety-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disaster_type: disasterInfo.disaster_type,
          location_type: 'urban',
          has_vulnerable_populations: true,
        }),
      });

      const data = await response.json();
      const instructions = [
        '📋 IMMEDIATE ACTIONS:',
        ...data.immediate_actions.slice(0, 3),
        '',
        '🛡️ SAFETY MEASURES:',
        ...data.safety_measures.slice(0, 3),
        '',
        '⚠️ AVOID:',
        ...data.things_to_avoid.slice(0, 3),
      ].join('\n');

      const result: QuickActionResult = {
        title: 'Safety Instructions',
        content: instructions,
        timestamp: new Date(),
      };
      setResults((prev) => [result, ...prev]);
      onActionComplete?.(result);
    } catch (error) {
      console.error('Error getting safety instructions:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAnalyze = async () => {
    setLoadingAction('analyze');
    try {
      const response = await fetch('http://localhost:8000/ai/analyze-situation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disaster_type: disasterInfo.disaster_type,
          severity_score: disasterInfo.severity_score,
          affected_population: 10000,
          affected_area_km2: 25.0,
          available_resources: availableResources.length,
          time_since_onset: '1 hour',
        }),
      });

      const data = await response.json();
      const analysis = [
        `📊 SITUATION SUMMARY:\n${data.situation_summary}`,
        '',
        `🚨 CRITICAL CHALLENGES:\n${data.critical_challenges.join('\n')}`,
        '',
        `💪 RESOURCES: ${data.resource_adequacy_assessment}`,
        '',
        `🎯 STRATEGY:\n${data.prioritization_strategy}`,
      ].join('\n');

      const result: QuickActionResult = {
        title: 'Situation Analysis',
        content: analysis,
        timestamp: new Date(),
      };
      setResults((prev) => [result, ...prev]);
      onActionComplete?.(result);
    } catch (error) {
      console.error('Error analyzing situation:', error);
    } finally {
      setLoadingAction(null);
    }
  };

  const getSeverityColor = (score: number) => {
    if (score >= 75) return 'destructive';
    if (score >= 50) return 'default';
    return 'secondary';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-600" />
          Quick Actions
        </CardTitle>
        <CardDescription>
          {disasterInfo.disaster_type.toUpperCase()} • Severity:{' '}
          <Badge variant={getSeverityColor(disasterInfo.severity_score)}>
            {disasterInfo.severity_score.toFixed(0)}%
          </Badge>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleExplain}
            disabled={loadingAction !== null}
            variant="outline"
            className="h-auto py-2 flex-col"
          >
            {loadingAction === 'explain' ? (
              <Loader className="w-4 h-4 animate-spin mb-1" />
            ) : (
              <AlertTriangle className="w-4 h-4 mb-1" />
            )}
            <span className="text-xs">Explain</span>
          </Button>

          <Button
            onClick={handleRecommend}
            disabled={loadingAction !== null}
            variant="outline"
            className="h-auto py-2 flex-col"
          >
            {loadingAction === 'recommend' ? (
              <Loader className="w-4 h-4 animate-spin mb-1" />
            ) : (
              <Users className="w-4 h-4 mb-1" />
            )}
            <span className="text-xs">Recommend</span>
          </Button>

          <Button
            onClick={handleSafety}
            disabled={loadingAction !== null}
            variant="outline"
            className="h-auto py-2 flex-col"
          >
            {loadingAction === 'safety' ? (
              <Loader className="w-4 h-4 animate-spin mb-1" />
            ) : (
              <Shield className="w-4 h-4 mb-1" />
            )}
            <span className="text-xs">Safety</span>
          </Button>

          <Button
            onClick={handleAnalyze}
            disabled={loadingAction !== null}
            variant="outline"
            className="h-auto py-2 flex-col"
          >
            {loadingAction === 'analyze' ? (
              <Loader className="w-4 h-4 animate-spin mb-1" />
            ) : (
              <Lightbulb className="w-4 h-4 mb-1" />
            )}
            <span className="text-xs">Analyze</span>
          </Button>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
            {results.map((result, idx) => (
              <details key={idx} className="p-3 bg-gray-100 rounded-lg">
                <summary className="font-medium cursor-pointer text-sm">
                  {result.title} • {result.timestamp.toLocaleTimeString()}
                </summary>
                <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap">
                  {result.content}
                </pre>
              </details>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
