const API_BASE_URL = 'http://localhost:8000';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  message: string;
  conversation_id: string;
  timestamp: string;
  thinking_time_ms?: number;
}

export interface DisasterExplanation {
  explanation: string;
  disaster_type: string;
  severity_level: string;
  key_impacts: string[];
  vulnerable_groups: string[];
  recommended_actions: string[];
}

export interface SafetyInstructions {
  disaster_type: string;
  immediate_actions: string[];
  safety_measures: string[];
  things_to_avoid: string[];
  evacuation_triggers: string[];
  emergency_contact_info: string;
  essential_supplies: string[];
  special_considerations?: string;
}

export interface ResourcePriority {
  rank: number;
  resource_name: string;
  resource_type: string;
  reasoning: string;
  estimated_arrival_minutes: number;
  primary_role: string;
}

export interface ResourcePrioritization {
  priorities: ResourcePriority[];
  situation_assessment: string;
  critical_challenges: string[];
  resource_adequacy: string;
  overall_strategy: string;
}

export interface SituationAnalysis {
  situation_summary: string;
  severity_level: string;
  critical_challenges: string[];
  resource_adequacy_assessment: string;
  prioritization_strategy: string;
  next_30_minute_actions: string[];
  forecast?: string;
}

export interface DecisionSummary {
  recommendation: string;
  confidence: number;
  key_factors: string[];
  alternative_actions: string[];
  risks: string[];
  benefits: string[];
}

class AIService {
  async chat(message: string, conversationId?: string, context?: any): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        context,
      }),
    });

    if (!response.ok) throw new Error(`Chat error: ${response.statusText}`);
    return response.json();
  }

  async explainDisaster(
    disasterType: string,
    latitude: number,
    longitude: number,
    severityScore: number,
    context?: string
  ): Promise<DisasterExplanation> {
    const response = await fetch(`${API_BASE_URL}/ai/explain-disaster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disaster_type: disasterType,
        latitude,
        longitude,
        severity_score: severityScore,
        context,
      }),
    });

    if (!response.ok) throw new Error(`Explanation error: ${response.statusText}`);
    return response.json();
  }

  async prioritizeResources(
    disasterType: string,
    severityScore: number,
    availableResources: any[],
    currentSituation?: string
  ): Promise<ResourcePrioritization> {
    const response = await fetch(`${API_BASE_URL}/ai/prioritize-resources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disaster_type: disasterType,
        severity_score: severityScore,
        available_resources: availableResources,
        current_situation: currentSituation,
      }),
    });

    if (!response.ok) throw new Error(`Prioritization error: ${response.statusText}`);
    return response.json();
  }

  async getSafetyInstructions(
    disasterType: string,
    locationType: string = 'urban',
    hasVulnerablePopulations: boolean = false
  ): Promise<SafetyInstructions> {
    const response = await fetch(`${API_BASE_URL}/ai/safety-instructions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disaster_type: disasterType,
        location_type: locationType,
        has_vulnerable_populations: hasVulnerablePopulations,
      }),
    });

    if (!response.ok) throw new Error(`Safety instructions error: ${response.statusText}`);
    return response.json();
  }

  async analyzeSituation(
    disasterType: string,
    severityScore: number,
    affectedPopulation: number,
    affectedAreaKm2: number,
    availableResources: number,
    timeSinceOnset: string
  ): Promise<SituationAnalysis> {
    const response = await fetch(`${API_BASE_URL}/ai/analyze-situation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disaster_type: disasterType,
        severity_score: severityScore,
        affected_population: affectedPopulation,
        affected_area_km2: affectedAreaKm2,
        available_resources: availableResources,
        time_since_onset: timeSinceOnset,
      }),
    });

    if (!response.ok) throw new Error(`Analysis error: ${response.statusText}`);
    return response.json();
  }

  async getDecision(
    disasterType: string,
    severityScore: number,
    availableResources: any[],
    currentSituation: string
  ): Promise<DecisionSummary> {
    const response = await fetch(`${API_BASE_URL}/ai/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disaster_type: disasterType,
        severity_score: severityScore,
        available_resources: availableResources,
        current_situation: currentSituation,
      }),
    });

    if (!response.ok) throw new Error(`Decision error: ${response.statusText}`);
    return response.json();
  }

  async getConversationHistory(conversationId: string, limit: number = 10): Promise<any> {
    const response = await fetch(
      `${API_BASE_URL}/ai/conversations/${conversationId}?limit=${limit}`
    );

    if (!response.ok) throw new Error(`History error: ${response.statusText}`);
    return response.json();
  }

  async clearConversation(conversationId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/ai/conversations/${conversationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error(`Clear error: ${response.statusText}`);
    return response.json();
  }
}

export default new AIService();
