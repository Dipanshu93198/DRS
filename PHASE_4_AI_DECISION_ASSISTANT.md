# PHASE 4: AI Decision Assistant

## Overview
An intelligent AI assistant powered by OpenAI that provides real-time decision support, disaster explanations, resource recommendations, and safety guidance for emergency responders and civilians.

## System Architecture

```
┌──────────────────────────────────────┐
│       Frontend React Components        │
│  - ChatPanel (voice + text)            │
│  - AIDecisionAssistant (quick actions) │
│  - Voice I/O integration               │
└────────────┬─────────────────────────┘
             │
        HTTP + WebSocket
             │
┌────────────▼──────────────────────────┐
│   FastAPI AI Router (/ai)              │
│  - /ai/chat (multi-turn conversation) │
│  - /ai/explain-disaster                │
│  - /ai/prioritize-resources            │
│  - /ai/safety-instructions             │
│  - /ai/analyze-situation               │
│  - /ai/decision (synthesis)            │
└────────────┬──────────────────────────┘
             │
┌────────────▼──────────────────────────┐
│  AI Service Layer                      │
│  - Prompt Template Engine              │
│  - Conversation Manager                │
│  - OpenAI API Integration              │
│  - Response Parsing                    │
└──────────────────────────────────────┘
             │
        OpenAI API (GPT-4)
```

## Features

### 💬 Multi-Turn Conversation
- **Context-Aware Chat**: Remembers conversation history
- **Configurable System Prompts**: Adapt AI behavior to different scenarios
- **Message Trimming**: Maintains optimal token usage
- **Conversation Management**: Save/load/clear conversations

### 🎤 Voice Interface
- **Speech-to-Text**: Browser native speech recognition
- **Text-to-Speech**: AI responses read aloud
- **Hands-Free Operation**: Support for voice commands
- **Fallback Support**: Works with text input when voice unavailable

### 🎯 Quick Actions
- **Explain Disaster**: Get tactical disaster explanations
- **Recommend Resources**: AI-powered resource prioritization
- **Safety Instructions**: Step-by-step civilian guidance
- **Situation Analysis**: Comprehensive emergency assessment

### 🧠 Smart Decision Making
- **Multi-Factor Analysis**: Considers multiple parameters
- **Resource Optimization**: Recommends best resource allocation
- **Risk Assessment**: Identifies challenges and risks
- **Tactical Guidance**: Provides operational recommendations

### 📊 AI Response Types

#### 1. Disaster Explanation
```json
{
  "explanation": "This fire...",
  "disaster_type": "fire",
  "severity_level": "SEVERE",
  "key_impacts": ["Building damage", "Power outages", "Air quality"],
  "vulnerable_groups": ["Children", "Elderly", "Respiratory patients"],
  "recommended_actions": ["Evacuate", "Shelter in place", "Monitor channels"]
}
```

#### 2. Resource Prioritization
```json
{
  "priorities": [
    {
      "rank": 1,
      "resource_name": "Ambulance-01",
      "resource_type": "ambulance",
      "reasoning": "Closest to incident, immediate medical needs",
      "estimated_arrival_minutes": 12,
      "primary_role": "Emergency medical response"
    }
  ],
  "situation_assessment": "Multiple casualties expected...",
  "critical_challenges": ["High casualty rate", "Limited access"],
  "resource_adequacy": "Insufficient for scale of incident",
  "overall_strategy": "Rapid triage and mass evacuation"
}
```

#### 3. Safety Instructions
```json
{
  "disaster_type": "flood",
  "immediate_actions": [
    "Move to high ground immediately",
    "Avoid walking in flood waters",
    "Turn off utilities"
  ],
  "safety_measures": [
    "Stay informed via emergency radio",
    "Keep away from downed power lines",
    "Avoid contaminated water"
  ],
  "evacuation_triggers": ["Water rises above ankle", "Current speeds exceed 2mph"],
  "essential_supplies": ["Water", "Food", "First aid", "Flashlight"]
}
```

#### 4. Situation Analysis
```json
{
  "situation_summary": "Large-scale earthquake...",
  "severity_level": "CRITICAL",
  "critical_challenges": [
    "Widespread infrastructure damage",
    "Overwhelming casualty numbers",
    "Communication disruption"
  ],
  "resource_adequacy_assessment": "Resources severely inadequate",
  "prioritization_strategy": "Triage-based response with mutual aid",
  "next_30_minute_actions": [
    "Implement ICS structure",
    "Call mutual aid resources",
    "Begin rapid triage",
    "Establish command post"
  ]
}
```

## Installation & Setup

### Configuration

1. **Get OpenAI API Key**
   - Sign up at https://platform.openai.com
   - Create API key in account settings
   - Copy key to `.env` file

2. **Update Backend `.env`**
   ```bash
   OPENAI_API_KEY=sk-YOUR-API-KEY-HERE
   OPENAI_MODEL=gpt-4
   OPENAI_TEMPERATURE=0.7
   OPENAI_MAX_TOKENS=2000
   ```

3. **Install Python Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

4. **Install Frontend Dependencies**
   ```bash
   npm install  # if not already done
   ```

### Running Phase 4

**Terminal 1 - Backend:**
```bash
cd backend
source venv/Scripts/activate  # Windows: venv\Scripts\activate
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd resilience-hub
npm run dev
```

**Access:**
- Frontend: http://localhost:8080
- API Docs: http://localhost:8000/docs

## API Reference

### Chat Endpoint

**POST /ai/chat**
```bash
curl -X POST http://localhost:8000/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What should citizens do during this earthquake?",
    "conversation_id": "conv-123",
    "context": {
      "disaster_type": "earthquake",
      "severity": 7.2,
      "location": "San Francisco"
    }
  }'
```

**Response:**
```json
{
  "message": "During an earthquake, immediately...",
  "conversation_id": "conv-123",
  "timestamp": "2026-02-20T10:30:00",
  "thinking_time_ms": 2341
}
```

### Disaster Explanation

**POST /ai/explain-disaster**
```bash
curl -X POST http://localhost:8000/ai/explain-disaster \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type": "fire",
    "latitude": 28.7041,
    "longitude": 77.1025,
    "severity_score": 75.0,
    "context": "Residential area, high winds"
  }'
```

### Resource Prioritization

**POST /ai/prioritize-resources**
```bash
curl -X POST http://localhost:8000/ai/prioritize-resources \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type": "earthquake",
    "severity_score": 85.0,
    "available_resources": [
      {"name": "Ambulance-01", "type": "ambulance", "distance_km": 5.0},
      {"name": "Rescue-01", "type": "rescue", "distance_km": 8.0}
    ],
    "current_situation": "Multiple buildings collapsed"
  }'
```

### Safety Instructions

**POST /ai/safety-instructions**
```bash
curl -X POST http://localhost:8000/ai/safety-instructions \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type": "flood",
    "location_type": "urban",
    "has_vulnerable_populations": true
  }'
```

### Situation Analysis

**POST /ai/analyze-situation**
```bash
curl -X POST http://localhost:8000/ai/analyze-situation \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type": "hurricane",
    "severity_score": 90.0,
    "affected_population": 500000,
    "affected_area_km2": 2000.0,
    "available_resources": 150,
    "time_since_onset": "2 hours"
  }'
```

### Get/Clear Conversations

```bash
# Get conversation history
GET /ai/conversations/{conversation_id}?limit=10

# Clear conversation
DELETE /ai/conversations/{conversation_id}
```

## Frontend Components

### ChatPanel Component
```typescript
import { ChatPanel } from '@/components/ChatPanel';

<ChatPanel
  conversationId={id}
  onConversationChange={(newId) => console.log(newId)}
  enableVoice={true}
/>
```

**Features:**
- Text input with send button
- Voice input with microphone toggle
- Message history with timestamps
- Auto-scroll to latest message
- Voice output for AI responses

### AIDecisionAssistant Component
```typescript
import { AIDecisionAssistant } from '@/components/AIDecisionAssistant';

<AIDecisionAssistant
  disasterInfo={{
    disaster_type: 'fire',
    severity_score: 75,
    latitude: 28.7041,
    longitude: 77.1025
  }}
  availableResources={resources}
  onActionComplete={(result) => console.log(result)}
/>
```

**Features:**
- Quick action buttons (Explain, Recommend, Safety, Analyze)
- Real-time loading indicators
- Collapsible result display
- Severity-based color coding

## Voice Integration

### Speech Recognition
```javascript
const recognition = new SpeechRecognition();
recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  // Send to chat
};
```

### Text-to-Speech
```javascript
const utterance = new SpeechSynthesisUtterance(text);
speechSynthesis.speak(utterance);
```

## Prompt Templates

The AI uses predefined prompts for consistency:

1. **Disaster Explanation**
   - What: Immediate impacts and hazards
   - Format: Operational and actionable

2. **Resource Priority**
   - What: Top resources to dispatch
   - Factors: Distance, type, severity, availability

3. **Safety Instructions**
   - What: Step-by-step actions for citizens
   - Format: Numbered, concise, clear

4. **Situation Analysis**
   - What: Comprehensive emergency assessment
   - Includes: Challenges, strategy, action items

## Performance Considerations

### Token Usage
- System prompt: ~200 tokens
- Average user message: ~20-50 tokens
- Average AI response: ~300-500 tokens
- **Per conversation cost**: ~5,000-10,000 tokens

### API Response Time
- P50: 2-3 seconds
- P95: 5-7 seconds
- P99: 10+ seconds

### Cost Estimation (GPT-4)
- Input: $0.03 per 1K tokens
- Output: $0.06 per 1K tokens
- **Estimated cost per conversation**: $0.30-0.60

## Testing

### Run Tests
```bash
cd backend
pytest tests/test_ai_logic.py -v
```

### Test Coverage
- ✅ Prompt template generation
- ✅ Severity level conversion
- ✅ Conversation management
- ✅ Variable substitution
- ✅ Message trimming
- ✅ History tracking

## Best Practices

### Using the AI Assistant

1. **Provide Context**
   - Always include disaster type, severity, location
   - Add current situational context
   - List available resources

2. **Request Specific Information**
   - "Explain this earthquake" (disaster explanation)
   - "Which resource should we dispatch?" (prioritization)
   - "What should civilians do?" (safety instructions)

3. **Review AI Recommendations**
   - Don't blindly follow AI suggestions
   - Cross-reference with local knowledge
   - Verify resource availability

4. **Use Conversation History**
   - Follow-up questions maintain context
   - Ask for clarifications or alternatives
   - Build on previous recommendations

### Optimizing Costs

1. **Reuse Conversations**
   - Keep conversation open for multiple queries
   - Avoid creating new conversations constantly
   - Use conversation IDs persistently

2. **Concise Prompts**
   - Be specific in requests
   - Avoid unnecessary context
   - Use structured input formats

3. **Batch Requests**
   - Combine related questions
   - Request multiple analyses together
   - Minimize API calls

## Error Handling

### API Errors
- Missing API key → 500 "OPENAI_API_KEY not configured"
- Rate limiting → Automatic retry with exponential backoff
- Network error → Fallback to cached responses

### Frontend Errors
- Conversation not found → Clear and create new
- WebSocket disconnect → Auto-reconnect with backoff
- Voice recognition unavailable → Fall back to text input

## Security Considerations

For production deployment:
- [ ] Add authentication layer
- [ ] Sanitize user inputs
- [ ] Validate AI outputs
- [ ] Rate limit API access
- [ ] Encrypt sensitive data
- [ ] Log all AI interactions
- [ ] Review AI responses before broadcast
- [ ] Add content filtering

## Limitations & Disclaimers

1. **AI Can Make Mistakes**
   - Always verify critical information
   - Don't rely solely on AI for life-safety decisions
   - Consult domain experts when possible

2. **Real-Time Limitations**
   - Trained data has knowledge cutoff
   - May not know about very recent events
   - Requires human validation

3. **Context Limitations**
   - Limited to conversation history
   - Cannot see real-time data automatically
   - Must be explicitly provided context

## Future Enhancements

- [ ] Streaming responses for faster feedback
- [ ] Multi-language support
- [ ] Custom prompt templates per disaster type
- [ ] Integration with real-time data feeds
- [ ] AI confidence scoring
- [ ] Human-in-the-loop validation
- [ ] Decision logging and analysis
- [ ] Cost tracking and optimization
- [ ] Fine-tuned models for disaster response
- [ ] Multimodal input (images, maps, graphs)

## Troubleshooting

### AI Not Responding
1. Check OpenAI API key in `.env`
2. Verify API key has proper permissions
3. Check API quota limits
4. Review OpenAI API status page

### Voice Not Working
1. Check browser microphone permissions
2. Verify browser supports Web Speech API (Chrome, Edge, Safari)
3. Check audio output for TTS
4. Try text input instead

### Slow Responses
1. Check network connection
2. Monitor OpenAI API load
3. Reduce OPENAI_MAX_TOKENS
4. Use shorter prompts

---

**Phase 4 Status: ✅ COMPLETE**

Ready for integration with Phase 5 (Citizen SOS + Real-Time Alerts)
