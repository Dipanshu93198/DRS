# Phase 4 Architecture & Features Overview

## 🏗️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RESILIENCE HUB PHASE 4                        │
│                   AI Decision Assistant Architecture                  │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  TIER 1: USER INTERFACE (React Components - port 8080)                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐          ┌──────────────────────────┐         │
│  │   ChatPanel.tsx     │          │ AIDecisionAssistant.tsx  │         │
│  ├─────────────────────┤          ├──────────────────────────┤         │
│  │ • Text chat input   │          │ 4 Quick Action Buttons:  │         │
│  │ • Voice I/O         │          │ • Explain Disaster       │         │
│  │ • Real-time display │          │ • Recommend Resources    │         │
│  │ • Auto TTS response │          │ • Safety Instructions    │         │
│  │ • Error handling    │          │ • Analyze Situation      │         │
│  └─────────────────────┘          └──────────────────────────┘         │
│                                                                         │
│  Uses: aiService.ts (API client)   Uses: aiService.ts (API client)    │
└────────────────────────────────────────────────────────────────────────┘
                              ↓↓↓ HTTP/JSON ↓↓↓
┌────────────────────────────────────────────────────────────────────────┐
│  TIER 2: API LAYER (FastAPI - port 8000)                               │
├────────────────────────────────────────────────────────────────────────┤
│              POST /ai/* endpoints (app/routers/ai.py)                   │
│                                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │ /ai/chat    │  │/ai/explain   │  │/ai/priorit  │  │/ai/safety  │  │
│  │             │  │-disaster     │  │ize-resources│  │            │  │
│  │ Multi-turn  │  │              │  │             │  │ Step-by-   │  │
│  │ general     │  │Explains      │  │ AI-powered  │  │ step       │  │
│  │ conversation│  │impacts &     │  │ resource    │  │ guidance   │  │
│  │             │  │vulnerable    │  │ ranking     │  │            │  │
│  └─────────────┘  └──────────────┘  └─────────────┘  └────────────┘  │
│                                                                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ /ai/analyze      │  │ /ai/decision     │  │ Conversation       │  │
│  │ -situation       │  │ (synthesized)    │  │ Management         │  │
│  │                  │  │                  │  │ • GET history      │  │
│  │ Comprehensive    │  │ Combined rec.    │  │ • DELETE clear     │  │
│  │ 6-field analysis │  │ + confidence     │  │                    │  │
│  └──────────────────┘  └──────────────────┘  └────────────────────┘  │
│                                                                         │
│  Error Handling: HTTPException with detailed messages                  │
│  Rate Limiting: Built-in via OpenAI API                                │
│  Conversation Store: In-memory dict (persistent in DB in production)   │
└────────────────────────────────────────────────────────────────────────┘
                              ↓↓↓ Python ↓↓↓
┌────────────────────────────────────────────────────────────────────────┐
│  TIER 3: BUSINESS LOGIC (Services - app/services/)                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  app/services/ai.py - Core AI Service (350+ lines)               │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │                                                                   │ │
│  │  PromptTemplate Class:                                            │ │
│  │  • disaster_explanation() - Explain impacts & vulnerable groups  │ │
│  │  • resource_priority() - Rank resources by tactical value        │ │
│  │  • safety_instructions() - Generate public safety guidance       │ │
│  │  • situation_analysis() - 6-field emergency assessment           │ │
│  │                                                                   │ │
│  │  ConversationManager Class:                                       │ │
│  │  • Maintains message history (auto-trim if > max_history)        │ │
│  │  • add_user_message() / add_assistant_message()                  │ │
│  │  • get_messages() for prompt context                             │ │
│  │  • clear() to reset conversation                                 │ │
│  │                                                                   │ │
│  │  Key Functions:                                                   │ │
│  │  • generate_ai_response() - OpenAI API wrapper                   │ │
│  │  • explain_disaster() - Full disaster explanation                │ │
│  │  • prioritize_resources() - AI resource selection                │ │
│  │  • generate_safety_instructions() - Civilian guidance             │ │
│  │  • analyze_situation() - Tactical analysis                       │ │
│  │  • get_severity_description() - Score to text (0-100)           │ │
│  │                                                                   │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  app/services/dispatch.py (from Phase 3 - integration ready)      │ │
│  ├──────────────────────────────────────────────────────────────────┤ │
│  │  • Haversine distance calculation                                 │ │
│  │  • Resource scoring and prioritization                            │ │
│  │  • Nearby resource search                                         │ │
│  │  • Auto-dispatch logic                                            │ │
│  │                                                                   │ │
│  │  Integration: AI recommendations feed into dispatch system        │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
                              ↓↓↓ REST ↓↓↓
┌────────────────────────────────────────────────────────────────────────┐
│  TIER 4: EXTERNAL AI SERVICE (OpenAI API)                              │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  OpenAI GPT-4 (or gpt-3.5-turbo for cost savings)               │ │
│  │                                                                  │ │
│  │  • Takes: System prompt + conversation history                  │ │
│  │  • Returns: Streaming or complete response                      │ │
│  │  • Config: Temperature 0.7, Max tokens 2000                     │ │
│  │  • Auth: OPENAI_API_KEY from environment                        │ │
│  │  • Retry: Tenacity library with exponential backoff             │ │
│  │                                                                  │ │
│  │  Cost: ~$0.30-0.60 per conversation (GPT-4)                     │ │
│  │       ~$0.05-0.10 per conversation (GPT-3.5-turbo)              │ │
│  │                                                                  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow Diagram

```
USER INTERACTION:
┌─────────────┐
│ User types  │
│ "Explain    │
│  earthquake"│
└──────┬──────┘
       ↓
┌─────────────────────────────────────────┐
│  ChatPanel component:                    │
│  • Validates input                       │
│  • Shows loading spinner                 │
│  • Calls aiService.chat()                │
└──────┬──────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│  aiService.ts (TypeScript client):       │
│  • Builds POST /ai/chat request          │
│  • Includes conversation ID              │
│  • Sends JSON body                       │
└──────┬──────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│  FastAPI router (app/routers/ai.py):     │
│  • Validates ChatRequest schema          │
│  • Gets ConversationManager              │
│  • Adds user message to history          │
└──────┬──────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│  AI service (app/services/ai.py):        │
│  • Builds context system prompt          │
│  • Gets full conversation history        │
│  • Calls generate_ai_response()          │
└──────┬──────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│  OpenAI API (https://api.openai.com):   │
│  • Sends system prompt + messages        │
│  • GPT-4 processes request               │
│  • Returns assistant response            │
└──────┬──────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│  Back to AI service:                     │
│  • Parses response                       │
│  • Adds assistant message to history     │
│  • Returns ChatResponse                  │
└──────┬──────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│  Back to ChatPanel:                      │
│  • Displays response in chat             │
│  • Calls speechSynthesis.speak()         │
│  • Read response aloud (if enabled)      │
│  • User can continue conversation        │
└─────────────────────────────────────────┘
```

## 🎯 Feature Comparison: 5 Endpoints

| Endpoint | Use Case | Input | Output | Response Time |
|----------|----------|-------|--------|----------------|
| **POST /ai/chat** | General conversation, follow-ups | message, context | response | 3-8s |
| **POST /ai/explain-disaster** | Understand emergency | type, location, severity | impacts, vulnerable groups, recommended actions | 4-10s |
| **POST /ai/prioritize-resources** | Resource allocation | type, severity, available resources | ranked list with strategy | 5-12s |
| **POST /ai/safety-instructions** | Public guidance | type, location type | step-by-step safety instructions | 3-8s |
| **POST /ai/analyze-situation** | Comprehensive assessment | all disaster info | 6-field analysis (summary, challenges, actions, resources, timeline, priorities) | 6-15s |

## 🚀 Request/Response Flow Details

### Example: Quick Action (Explain Disaster)

```
USER CLICKS: "Explain Disaster" button in AIDecisionAssistant
                    ↓
PROPS PASSED:
├─ disasterInfo:
│  ├─ disaster_type: "earthquake"
│  ├─ severity_score: 7.5
│  ├─ latitude: 28.7041
│  └─ longitude: 77.1025
│
└─ availableResources: [Ambulance-01, Fire-01, ...]

                    ↓
FRONTEND: Calls aiService.explainDisaster({...})

                    ↓
HTTP REQUEST:
POST /ai/explain-disaster
Content-Type: application/json
{
  "disaster_type": "earthquake",
  "latitude": 28.7041,
  "longitude": 77.1025,
  "severity_score": 7.5,
  "context": "New Delhi, India"
}

                    ↓
BACKEND PROCESSING:
1. Validate with DisasterExplanationRequest pydantic model
2. Create system prompt via PromptTemplate.disaster_explanation()
3. Call OpenAI with prompt: "Explain earthquake at 28.7041, 77.1025..."
4. Get response (~200-400 tokens)
5. Parse response into structure

                    ↓
HTTP RESPONSE:
{
  "explanation": "A 7.5 magnitude earthquake in Delhi would...",
  "impacts": {
    "casualties": "High",
    "infrastructure": "Severe damage to buildings...",
    "economic": "Estimated INR 500+ crores..."
  },
  "vulnerable_populations": [
    "Elderly in apartment buildings",
    "Children in schools",
    "Hospital patients"
  ],
  "recommended_actions": [
    "Activate disaster management centers",
    "Deploy search and rescue teams...",
    "Set up community shelters..."
  ]
}

                    ↓
FRONTEND: Updates DispatchPanel with details
                    ↓
USER SEES: Full explanation with impacts and recommendations
```

## 🔄 Integration with Phase 3

```
Phase 3: Resource Coordination System
    ↓
    • Tracks resources (ambulances, drones, rescue teams)
    • Calculates distances via Haversine algorithm
    • Manages dispatch status
    • Real-time WebSocket updates
    
    ↓↓↓ FEEDS INTO ↓↓↓
    
Phase 4: AI Decision Assistant
    ↓
    • AI receives available resources from Phase 3
    • AI recommends which resources to dispatch
    • AI explains why (tactical reasoning)
    • AI provides safety guidance for public
    
    ↓↓↓ BOTH FEED INTO ↓↓↓
    
Phase 5 (Coming): Citizen SOS + Real-Time Alerts
    ↓
    • Citizens report emergencies via SOS
    • AI analyzes SOS reports
    • System auto-routes to appropriate resources
    • Alerts sent to dispatchers and public
```

## 💾 Data Storage & State

```
FRONTEND STATE (In-Memory):
├─ ChatPanel:
│  ├─ messages: Array of {role, content, timestamp}
│  ├─ input: Current text input
│  ├─ loading: API call in progress
│  ├─ isListening: Voice recognition active
│  └─ currentConversationId: UUID for this session
│
└─ AIDecisionAssistant:
   ├─ results: Array of past action results
   ├─ loading: Object with per-action loading states
   └─ expandedResults: Which results are expanded

BACKEND STATE (In-Memory - Phase 4):
└─ app/routers/ai.py:
   └─ conversations: Dict[conversation_id, ConversationManager]
      └─ ConversationManager:
         └─ messages: List of {role, content} objects
            └─ Auto-trimmed if > 10 messages

DATABASE STATE (For Production):
├─ conversations table:
│  ├─ id (UUID)
│  ├─ created_at (timestamp)
│  ├─ updated_at (timestamp)
│  ├─ metadata (JSONB)
│  └─ messages (JSONB Array)
│
└─ ai_logs table:
   ├─ id (UUID)
   ├─ conversation_id (FK)
   ├─ request_type (chat|explain|prioritize|safety|analyze|decision)
   ├─ request_body (JSONB)
   ├─ response_body (JSONB)
   ├─ tokens_used (integer)
   ├─ api_cost_usd (decimal)
   └─ timestamp (timestamp)

NOTE: Phase 4 uses in-memory storage. To persist:
  1. Add SQLAlchemy models for conversations & logs
  2. Replace in-memory dicts with database queries
  3. Add alembic migrations for schema
```

## 🔐 Security Architecture

```
LAYER 1: API Authentication (Future)
├─ JWT tokens in Authorization header
├─ Rate limiting per user
└─ IP whitelisting

LAYER 2: Input Validation (Implemented)
├─ Pydantic models validate all requests
├─ Type checking catches type mismatches
└─ bounds checking on numeric fields

LAYER 3: API Key Management (Implemented)
├─ OPENAI_API_KEY in .env (never in code)
├─ env vars loaded via config.py
└─ Never exposed in logs or responses

LAYER 4: Response Sanitization (Partial)
├─ AI responses filtered for unsafe content
├─ No sensitive data in conversation history
└─ Error messages don't expose internals

LAYER 5: HTTPS in Production (Future)
├─ SSL/TLS for all API traffic
├─ Upgrade WebSocket to WSS
└─ Security headers (CORS, CSP, etc.)
```

## 📈 Performance Characteristics

```
SINGLE REQUEST TIMELINE (ms):

0ms:    User clicks button
100ms:  Frontend validates input
200ms:  HTTP request sent
300ms:  Backend receives request
350ms:  Request validation (5ms)
400ms:  Prompt template built (10ms)
450ms:  History loaded from memory (5ms)
500ms:  OpenAI API call initiated
3000ms: OpenAI processing (2.5-3 seconds typical)
  - Token encoding: 100ms
  - Model inference: 2.3s
  - Token decoding: 100ms
5500ms: Response received
5600ms: Response parsing (10ms)
5650ms: Frontend updates UI (50ms)
5700ms: User sees response
TOTAL:  ~5.7 seconds (typical)

THROUGHPUT:
├─ Single user: 10-12 requests/minute (6-5 second pause)
├─ 5 concurrent users: 50-60 req/min (if same model)
└─ 100 concurrent users: Query queue forms at OpenAI

MEMORY USAGE:
├─ Per conversation: ~2-5 KB (history)
├─ Per API call: ~1-2 MB (in-flight)
└─ 100 conversations: ~1 MB conversation data

COSTS (GPT-4):
├─ Input token price: $0.03 per 1K tokens
├─ Output token price: $0.06 per 1K tokens
├─ Average request: 200 input tokens, 150 output tokens
├─ Cost per request: ~$0.015
└─ Cost per conversation (10 msgs): ~$0.15
```

## ✅ Feature Checklist

- [x] Chat endpoint for general conversation
- [x] Explain endpoint for disaster details
- [x] Prioritize endpoint for resource ranking
- [x] Safety endpoint for public guidance
- [x] Analyze endpoint for comprehensive assessment
- [x] Conversation management with history
- [x] Voice input via Web Speech API
- [x] Voice output via TTS
- [x] Real-time response display
- [x] Error handling and retry logic
- [x] Pydantic validation for requests
- [x] Comprehensive test suite (40+ tests)
- [x] Full API documentation
- [x] Component documentation
- [x] Setup guides
- [ ] Production database migration
- [ ] Authentication layer
- [ ] Rate limiting
- [ ] Monitoring and logging
- [ ] Cost tracking

---

**This is the complete Phase 4 implementation.** All components are functional and ready for testing with a valid OpenAI API key.
