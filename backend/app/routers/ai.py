from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, List, Optional
from datetime import datetime
from uuid import uuid4
import time

from app.schemas_ai import (
    ChatRequest, ChatResponse,
    DisasterExplanationRequest, DisasterExplanationResponse,
    ResourcePriorityRequest, ResourcePriorityResponse, ResourcePriority,
    SafetyInstructionsRequest, SafetyInstructionsResponse,
    SituationAnalysisRequest, SituationAnalysisResponse,
    DecisionSummary
)
from app.services.ai import (
    ConversationManager, explain_disaster, prioritize_resources,
    generate_safety_instructions, analyze_situation, PromptTemplate,
    get_severity_description
)

router = APIRouter(prefix="/ai", tags=["ai"])

# In-memory conversation store (use Redis or database for production)
conversations: Dict[str, ConversationManager] = {}


def get_or_create_conversation(conversation_id: Optional[str] = None) -> tuple[str, ConversationManager]:
    """Get existing conversation or create new one"""
    if not conversation_id or conversation_id not in conversations:
        conversation_id = str(uuid4())
        conversations[conversation_id] = ConversationManager()
    
    return conversation_id, conversations[conversation_id]


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    General purpose chat with AI assistant
    Can handle questions about disasters, resources, and emergency response
    """
    try:
        start_time = time.time()
        
        conversation_id, manager = get_or_create_conversation(request.conversation_id)
        
        # Build context-aware system prompt
        system_prompt = build_context_system_prompt(request.context)
        
        # Get AI response
        response_text = await manager.get_response(request.message, system_prompt)
        
        thinking_time = int((time.time() - start_time) * 1000)
        
        return ChatResponse(
            message=response_text,
            conversation_id=conversation_id,
            thinking_time_ms=thinking_time
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/explain-disaster", response_model=DisasterExplanationResponse)
async def explain_disaster_endpoint(request: DisasterExplanationRequest):
    """
    Get AI explanation of a disaster
    Includes impacts, spread estimates, vulnerable populations, and infrastructure risks
    """
    try:
        explanation_text = await explain_disaster(
            disaster_type=request.disaster_type,
            latitude=request.latitude,
            longitude=request.longitude,
            severity_score=request.severity_score,
            context=request.context
        )
        
        # Parse response to extract structured data
        return DisasterExplanationResponse(
            explanation=explanation_text,
            disaster_type=request.disaster_type,
            severity_level=get_severity_description(request.severity_score),
            key_impacts=extract_impacts(explanation_text),
            vulnerable_groups=extract_vulnerable_groups(request.disaster_type),
            recommended_actions=extract_actions(explanation_text)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Explanation error: {str(e)}")


@router.post("/prioritize-resources", response_model=ResourcePriorityResponse)
async def prioritize_resources_endpoint(request: ResourcePriorityRequest):
    """
    Get AI-powered resource prioritization recommendations
    Considers resource type, distance, and disaster severity
    """
    try:
        priority_text = await prioritize_resources(
            disaster_type=request.disaster_type,
            severity_score=request.severity_score,
            available_resources=request.available_resources,
            current_situation=request.current_situation
        )
        
        # Parse response to extract structured data
        priorities = parse_priorities(priority_text, request.available_resources)
        
        return ResourcePriorityResponse(
            priorities=priorities,
            situation_assessment=extract_situation_assessment(priority_text),
            critical_challenges=extract_challenges(priority_text),
            resource_adequacy=extract_adequacy(priority_text),
            overall_strategy=extract_strategy(priority_text)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prioritization error: {str(e)}")


@router.post("/safety-instructions", response_model=SafetyInstructionsResponse)
async def get_safety_instructions(request: SafetyInstructionsRequest):
    """
    Get step-by-step safety instructions for civilians
    Tailored to disaster type, location, and vulnerable populations
    """
    try:
        instructions_text = await generate_safety_instructions(
            disaster_type=request.disaster_type,
            location_type=request.location_type,
            has_vulnerable_populations=request.has_vulnerable_populations
        )
        
        return SafetyInstructionsResponse(
            disaster_type=request.disaster_type,
            immediate_actions=extract_numbered_list("Immediate actions", instructions_text),
            safety_measures=extract_numbered_list("Safety measures", instructions_text),
            things_to_avoid=extract_numbered_list("avoid", instructions_text),
            evacuation_triggers=extract_numbered_list("evacuation", instructions_text),
            emergency_contact_info="Call emergency services: 911 (US), 112 (EU), 999 (UK), 100 (India)",
            essential_supplies=extract_numbered_list("supplies", instructions_text),
            special_considerations=extract_special_considerations(instructions_text) if request.has_vulnerable_populations else None
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Safety instructions error: {str(e)}")


@router.post("/analyze-situation", response_model=SituationAnalysisResponse)
async def analyze_situation_endpoint(request: SituationAnalysisRequest):
    """
    Get comprehensive AI analysis of emergency situation
    Includes challenges, resource assessment, and action plan
    """
    try:
        analysis_text = await analyze_situation(
            disaster_type=request.disaster_type,
            severity_score=request.severity_score,
            affected_population=request.affected_population,
            affected_area_km2=request.affected_area_km2,
            available_resources=request.available_resources,
            time_since_onset=request.time_since_onset
        )
        
        return SituationAnalysisResponse(
            situation_summary=extract_situation_summary(analysis_text),
            severity_level=get_severity_description(request.severity_score),
            critical_challenges=extract_challenges(analysis_text),
            resource_adequacy_assessment=extract_adequacy(analysis_text),
            prioritization_strategy=extract_strategy(analysis_text),
            next_30_minute_actions=extract_action_items(analysis_text),
            forecast=extract_forecast(analysis_text)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")


@router.post("/decision", response_model=DecisionSummary)
async def get_decision(
    disaster_type: str,
    severity_score: float,
    available_resources: List[Dict],
    current_situation: str
):
    """
    Get a specific decision recommendation
    Synthesizes disaster explanation, resource prioritization, and safety measures
    """
    try:
        # Get resource priorities
        priorities = await prioritize_resources(
            disaster_type=disaster_type,
            severity_score=severity_score,
            available_resources=available_resources,
            current_situation=current_situation
        )
        
        # Extract top recommendation
        lines = priorities.split('\n')
        top_rec = next((l for l in lines if 'first' in l.lower()), lines[0])
        
        return DecisionSummary(
            recommendation=top_rec,
            confidence=min(0.95, 0.5 + (severity_score / 100) * 0.45),
            key_factors=[
                "Resource distance",
                f"{disaster_type} severity",
                "Resource type match",
                "Availability status"
            ],
            alternative_actions=[],
            risks=["Communication delays", "Resource unavailability"],
            benefits=["Rapid response", "Appropriate resource match"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Decision error: {str(e)}")


@router.get("/conversations/{conversation_id}")
async def get_conversation_history(conversation_id: str, limit: int = 10):
    """Get conversation history"""
    if conversation_id not in conversations:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    manager = conversations[conversation_id]
    messages = manager.get_messages()[-limit:]
    
    return {
        "conversation_id": conversation_id,
        "messages": messages,
        "message_count": len(messages)
    }


@router.delete("/conversations/{conversation_id}")
async def clear_conversation(conversation_id: str):
    """Clear a conversation"""
    if conversation_id in conversations:
        conversations[conversation_id].clear()
        return {"status": "cleared", "conversation_id": conversation_id}
    
    raise HTTPException(status_code=404, detail="Conversation not found")


# Helper functions for parsing AI responses

def build_context_system_prompt(context: Optional[Dict]) -> str:
    """Build system prompt with context"""
    base_prompt = """You are an AI Emergency Response Assistant for disaster management. 
    You help emergency responders and civilians by:
    1. Explaining disasters and their immediate impacts
    2. Recommending safe actions for civilians
    3. Prioritizing resource dispatch
    4. Providing tactical guidance to responders
    
    Always prioritize safety and clarity. Be concise but comprehensive."""
    
    if context:
        context_str = "\n".join([f"- {k}: {v}" for k, v in context.items()])
        return f"{base_prompt}\n\nContext:\n{context_str}"
    
    return base_prompt


def extract_impacts(text: str) -> List[str]:
    """Extract key impacts from text"""
    impacts = []
    for line in text.split('\n'):
        if any(word in line.lower() for word in ['impact', 'hazard', 'risk', 'danger']):
            impacts.append(line.strip())
    return impacts[:5] if impacts else ["See explanation for details"]


def extract_vulnerable_groups(disaster_type: str) -> List[str]:
    """Get vulnerable groups for disaster type"""
    groups = {
        "fire": ["People with mobility issues", "Children", "Elderly", "Hospitalized patients"],
        "flood": ["Non-swimmers", "Elderly", "Young children", "Disabled persons"],
        "earthquake": ["Children", "Elderly", "Pregnant women", "People with disabilities"],
        "chemical": ["People with respiratory conditions", "Elderly", "Young children"],
        "medical": ["Immunocompromised", "Chronic disease patients", "Pregnant women"],
    }
    return groups.get(disaster_type.lower(), ["Elderly", "Children", "Disabled persons"])


def extract_actions(text: str) -> List[str]:
    """Extract recommended actions from text"""
    actions = []
    for line in text.split('\n'):
        if any(word in line.lower() for word in ['action', 'recommend', 'should', 'must']):
            actions.append(line.strip())
    return actions[:5] if actions else ["See explanation for details"]


def extract_situation_assessment(text: str) -> str:
    """Extract situation assessment"""
    lines = text.split('\n')
    for i, line in enumerate(lines):
        if 'assess' in line.lower() or 'situation' in line.lower():
            return lines[i:i+3].__str__().replace("['", "").replace("']", "").replace("', '", " ")
    return text[:200]


def extract_challenges(text: str) -> List[str]:
    """Extract critical challenges"""
    challenges = []
    for line in text.split('\n'):
        if any(word in line.lower() for word in ['challenge', 'difficult', 'obstacle', 'problem']):
            challenges.append(line.strip())
    return challenges[:5] if challenges else ["Resource coordination", "Information flow"]


def extract_adequacy(text: str) -> str:
    """Extract resource adequacy assessment"""
    for line in text.split('\n'):
        if 'adequate' in line.lower() or 'sufficient' in line.lower():
            return line.strip()
    return "Resources need to be assessed"


def extract_strategy(text: str) -> str:
    """Extract overall strategy"""
    for line in text.split('\n'):
        if 'strateg' in line.lower() or 'approach' in line.lower():
            return line.strip()
    return text[:100]


def extract_numbered_list(keyword: str, text: str) -> List[str]:
    """Extract numbered list from text"""
    items = []
    lines = text.split('\n')
    capture = False
    
    for line in lines:
        if keyword.lower() in line.lower():
            capture = True
            continue
        if capture:
            if line.strip() and (line[0].isdigit() or line.strip().startswith('-')):
                items.append(line.strip().lstrip('0123456789.- '))
            elif not line.strip():
                break
    
    return items if items else ["See instructions for details"]


def extract_special_considerations(text: str) -> str:
    """Extract special considerations"""
    for line in text.split('\n'):
        if 'special' in line.lower() or 'vulnerable' in line.lower() or 'elderly' in line.lower():
            return line.strip()
    return None


def extract_situation_summary(text: str) -> str:
    """Extract situation summary"""
    lines = text.split('\n')
    return lines[0] if lines else text[:200]


def extract_action_items(text: str) -> List[str]:
    """Extract action items"""
    items = []
    for line in text.split('\n'):
        if any(word in line.lower() for word in ['action', 'step', 'item', 'task']):
            items.append(line.strip())
    return items[:5] if items else ["Mobilize resources", "Establish coordination", "Begin response"]


def extract_forecast(text: str) -> str:
    """Extract forecast information"""
    for line in text.split('\n'):
        if any(word in line.lower() for word in ['forecast', 'expect', 'trend', 'duration']):
            return line.strip()
    return None


def parse_priorities(text: str, resources: List[Dict]) -> List[ResourcePriority]:
    """Parse resource priorities from AI response"""
    priorities = []
    
    for i, resource in enumerate(resources[:3], 1):
        priorities.append(ResourcePriority(
            rank=i,
            resource_name=resource.get('name', f'Resource-{i}'),
            resource_type=resource.get('type', 'unknown'),
            reasoning=f"Selected for priority {i} response",
            estimated_arrival_minutes=float(resource.get('distance_km', 0)) / 50 * 60,
            primary_role="Primary support" if i == 1 else f"Support role {i}"
        ))
    
    return priorities
