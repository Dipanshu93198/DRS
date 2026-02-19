from typing import Optional, Dict, List
from datetime import datetime
from app.config import settings
import openai

# Initialize OpenAI client
client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)


class PromptTemplate:
    """Template for AI prompts with variable substitution"""
    
    @staticmethod
    def disaster_explanation(
        disaster_type: str,
        latitude: float,
        longitude: float,
        severity_score: float,
        context: Optional[str] = None
    ) -> str:
        """Generate prompt for disaster explanation"""
        location_desc = f"({latitude:.4f}, {longitude:.4f})"
        severity_desc = get_severity_description(severity_score)
        
        prompt = f"""As an emergency response AI, explain the current {disaster_type} 
        at location {location_desc} with severity level {severity_desc} ({severity_score}/100).
        
        Provide:
        1. Immediate impacts and hazards
        2. Expected spread/duration estimates  
        3. Most vulnerable populations
        4. Infrastructure at risk
        
        Keep explanation operational and actionable."""
        
        if context:
            prompt += f"\n\nAdditional context: {context}"
        
        return prompt
    
    @staticmethod
    def resource_priority(
        disaster_type: str,
        severity_score: float,
        available_resources: List[Dict],
        current_situation: Optional[str] = None
    ) -> str:
        """Generate prompt for resource prioritization"""
        
        resource_list = "\n".join([
            f"  - {r.get('name', 'Unknown')} ({r.get('type', 'unknown')} type, "
            f"{r.get('distance_km', 'unknown')} km away)"
            for r in available_resources
        ])
        
        severity_desc = get_severity_description(severity_score)
        
        prompt = f"""Given a {severity_desc} severity {disaster_type} disaster, 
        prioritize dispatch from these available resources:
        
{resource_list}

Provide:
1. Top 3 resources to dispatch by priority
2. Reasoning for each selection
3. Type of assistance each should provide
4. Recommended arrival sequence

Be tactical and specific."""
        
        if current_situation:
            prompt += f"\n\nCurrent situation: {current_situation}"
        
        return prompt
    
    @staticmethod
    def safety_instructions(
        disaster_type: str,
        location_type: str = "urban",
        has_vulnerable_populations: bool = False
    ) -> str:
        """Generate prompt for safety instructions"""
        
        prompt = f"""Provide step-by-step safety instructions for civilians in a {disaster_type} 
        in a {location_type} area.
        
        Include:
        1. Immediate actions (first 5 minutes)
        2. Safety measures to take
        3. What to avoid
        4. When to evacuate
        5. How to call for help
        6. Essential supplies to bring
        
        Format as numbered, concise, actionable steps."""
        
        if has_vulnerable_populations:
            prompt += "\n\nSpecial considerations for elderly, disabled, and children."
        
        return prompt
    
    @staticmethod
    def situation_analysis(
        disaster_type: str,
        severity_score: float,
        affected_population: int,
        affected_area_km2: float,
        available_resources: int,
        time_since_onset: str
    ) -> str:
        """Generate prompt for overall situation analysis"""
        
        severity_desc = get_severity_description(severity_score)
        
        prompt = f"""Analyze this emergency situation:
        - Disaster: {disaster_type}
        - Severity: {severity_desc} ({severity_score}/100)
        - Affected population: {affected_population:,}
        - Affected area: {affected_area_km2} km²
        - Available resources: {available_resources}
        - Time since onset: {time_since_onset}
        
        Provide:
        1. Situation assessment (2-3 sentences)
        2. Critical challenges
        3. Resource adequacy assessment
        4. Recommended prioritization strategy
        5. Next 30-minute action items"""
        
        return prompt


def get_severity_description(score: float) -> str:
    """Convert severity score to descriptive level"""
    if score >= 90:
        return "CRITICAL"
    elif score >= 75:
        return "SEVERE"
    elif score >= 50:
        return "MODERATE"
    elif score >= 25:
        return "MINOR"
    else:
        return "MINIMAL"


async def generate_ai_response(
    prompt: str,
    system_role: Optional[str] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
    stream: bool = False
) -> str:
    """
    Generate response from OpenAI API
    
    Args:
        prompt: The user/system prompt
        system_role: Custom system role (overrides config default)
        temperature: Creativity level (0-2)
        max_tokens: Maximum response length
        stream: Whether to stream response
    
    Returns:
        Al response text
    """
    if not settings.OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not configured")
    
    system_role = system_role or settings.AI_SYSTEM_PROMPT
    temperature = temperature if temperature is not None else settings.OPENAI_TEMPERATURE
    max_tokens = max_tokens or settings.OPENAI_MAX_TOKENS
    
    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_role},
                {"role": "user", "content": prompt}
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            stream=stream
        )
        
        if stream:
            return response
        
        return response.choices[0].message.content
    
    except openai.APIError as e:
        raise Exception(f"OpenAI API error: {str(e)}")


async def explain_disaster(
    disaster_type: str,
    latitude: float,
    longitude: float,
    severity_score: float,
    context: Optional[str] = None
) -> str:
    """Explain a disaster to operators/public"""
    prompt = PromptTemplate.disaster_explanation(
        disaster_type, latitude, longitude, severity_score, context
    )
    return await generate_ai_response(prompt)


async def prioritize_resources(
    disaster_type: str,
    severity_score: float,
    available_resources: List[Dict],
    current_situation: Optional[str] = None
) -> str:
    """Get AI-powered resource prioritization"""
    prompt = PromptTemplate.resource_priority(
        disaster_type, severity_score, available_resources, current_situation
    )
    return await generate_ai_response(prompt)


async def generate_safety_instructions(
    disaster_type: str,
    location_type: str = "urban",
    has_vulnerable_populations: bool = False
) -> str:
    """Generate safety instructions for public"""
    prompt = PromptTemplate.safety_instructions(
        disaster_type, location_type, has_vulnerable_populations
    )
    
    # Use lower temperature for precise instructions
    return await generate_ai_response(prompt, temperature=0.3)


async def analyze_situation(
    disaster_type: str,
    severity_score: float,
    affected_population: int,
    affected_area_km2: float,
    available_resources: int,
    time_since_onset: str
) -> str:
    """Get comprehensive situation analysis"""
    prompt = PromptTemplate.situation_analysis(
        disaster_type, severity_score, affected_population,
        affected_area_km2, available_resources, time_since_onset
    )
    return await generate_ai_response(prompt)


class ConversationManager:
    """Manage multi-turn conversation history"""
    
    def __init__(self, max_history: int = 10):
        self.messages: List[Dict[str, str]] = []
        self.max_history = max_history
    
    def add_user_message(self, content: str):
        """Add user message to history"""
        self.messages.append({"role": "user", "content": content})
        self._trim_history()
    
    def add_assistant_message(self, content: str):
        """Add assistant message to history"""
        self.messages.append({"role": "assistant", "content": content})
        self._trim_history()
    
    def get_messages(self) -> List[Dict[str, str]]:
        """Get current message history"""
        return self.messages.copy()
    
    def _trim_history(self):
        """Keep only recent messages"""
        if len(self.messages) > self.max_history:
            # Keep system message + recent messages
            self.messages = self.messages[-(self.max_history - 1):]
    
    def clear(self):
        """Clear conversation history"""
        self.messages = []
    
    async def get_response(
        self,
        user_message: str,
        system_role: Optional[str] = None
    ) -> str:
        """Get response in context of conversation"""
        self.add_user_message(user_message)
        
        system_role = system_role or settings.AI_SYSTEM_PROMPT
        
        try:
            response = client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_role},
                    *self.messages
                ],
                temperature=settings.OPENAI_TEMPERATURE,
                max_tokens=settings.OPENAI_MAX_TOKENS
            )
            
            assistant_message = response.choices[0].message.content
            self.add_assistant_message(assistant_message)
            
            return assistant_message
        
        except openai.APIError as e:
            raise Exception(f"OpenAI API error: {str(e)}")
