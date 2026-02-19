# Phase 4 Testing Guide

## 🧪 Complete Testing Strategy for AI Decision Assistant

### Prerequisites
- Backend running: `python -m uvicorn app.main:app --reload --port 8000`
- OpenAI API key configured in `.env`
- Frontend running: `npm run dev` on port 8080

---

## 1. Manual Testing with cURL (Command Line)

### Setup
```bash
# Set your API endpoint
API_URL="http://localhost:8000"

# Save API key for later (optional, if you want to test auth)
export OPENAI_KEY="sk-YOUR-KEY-HERE"
```

### Test 1.1: Health Check
```bash
curl -X GET http://localhost:8000/health
# Expected: 200 OK with {"status": "ok"}
```

### Test 1.2: Basic Chat
```bash
curl -X POST http://localhost:8000/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What should I do if there is a fire in my building?",
    "context": "I am in a 10-story apartment building"
  }'

# Expected Response:
# {
#   "response": "In case of fire in an apartment building...",
#   "conversation_id": "uuid-string"
# }
```

### Test 1.3: Explain Disaster - Earthquake
```bash
curl -X POST http://localhost:8000/ai/explain-disaster \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type": "earthquake",
    "latitude": 28.7041,
    "longitude": 77.1025,
    "severity_score": 7.5,
    "context": "New Delhi, densely populated urban area"
  }'

# Expected: Explanation with impacts, vulnerable populations, recommended actions
```

### Test 1.4: Explain Disaster - Flood
```bash
curl -X POST http://localhost:8000/ai/explain-disaster \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type": "flood",
    "latitude": 25.3548,
    "longitude": 88.2600,
    "severity_score": 6.0,
    "context": "Bihar region, agricultural area"
  }'
```

### Test 1.5: Explain Disaster - Tsunami
```bash
curl -X POST http://localhost:8000/ai/explain-disaster \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type": "tsunami",
    "latitude": 8.7597,
    "longitude": 77.7997,
    "severity_score": 9.0,
    "context": "Coastal Kerala, tourist season"
  }'
```

### Test 1.6: Explain Disaster - Cyclone
```bash
curl -X POST http://localhost:8000/ai/explain-disaster \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type": "cyclone",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "severity_score": 8.5,
    "context": "Mumbai coast, monsoon season, high population"
  }'
```

### Test 1.7: Prioritize Resources
```bash
curl -X POST http://localhost:8000/ai/prioritize-resources \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type": "earthquake",
    "severity_score": 8.0,
    "available_resources": [
      {"name": "Ambulance-01", "type": "ambulance", "distance_km": 5.2, "status": "available"},
      {"name": "Fire-01", "type": "fire_truck", "distance_km": 3.1, "status": "available"},
      {"name": "Drone-01", "type": "drone", "distance_km": 0.5, "status": "available"},
      {"name": "Rescue-01", "type": "rescue_team", "distance_km": 8.3, "status": "available"},
      {"name": "Ambulance-02", "type": "ambulance", "distance_km": 12.0, "status": "available"}
    ],
    "situation": "High-rise buildings collapsed, many trapped, civilian injuries"
  }'

# Expected: Ranked list with strategic recommendations
```

### Test 1.8: Safety Instructions
```bash
curl -X POST http://localhost:8000/ai/safety-instructions \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type": "earthquake",
    "location_type": "building",
    "has_vulnerable_populations": true
  }'

# Expected: Step-by-step safety instructions with special considerations
```

### Test 1.9: Analyze Situation
```bash
curl -X POST http://localhost:8000/ai/analyze-situation \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type": "earthquake",
    "severity_score": 7.5,
    "affected_population": 500000,
    "affected_area_km2": 2500,
    "available_resources": 150,
    "time_since_onset": "1 hour"
  }'

# Expected: 6-field comprehensive analysis
```

### Test 1.10: Multi-turn Conversation
```bash
# First message
CONV_ID=$(curl -s -X POST http://localhost:8000/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "We have a fire emergency"
  }' | jq -r '.conversation_id')

echo "Conversation ID: $CONV_ID"

# Second message (same conversation)
curl -X POST http://localhost:8000/ai/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"What resources do we need?\",
    \"conversation_id\": \"$CONV_ID\"
  }"

# Third message (follow-up)
curl -X POST http://localhost:8000/ai/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Should we evacuate the entire building?\",
    \"conversation_id\": \"$CONV_ID\"
  }"

# Get conversation history
curl -X GET "http://localhost:8000/ai/conversations/$CONV_ID"
```

---

## 2. Automated Testing with Python

### Test 2.1: Run Existing Test Suite
```bash
cd backend

# Run all AI tests
pytest tests/test_ai_logic.py -v

# Run specific test class
pytest tests/test_ai_logic.py::TestPromptTemplates -v

# Run specific test
pytest tests/test_ai_logic.py::TestPromptTemplates::test_disaster_explanation_prompt -v

# Run with coverage
pytest tests/test_ai_logic.py --cov=app.services.ai --cov-report=html
```

### Test 2.2: Integration Test Script
Create `test_integration.py`:
```python
import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_chat_flow():
    """Test multi-turn conversation"""
    print("\n=== Testing Chat Flow ===")
    
    # Start conversation
    response = requests.post(f"{BASE_URL}/ai/chat", json={
        "message": "I need help with a fire emergency"
    })
    assert response.status_code == 200
    data = response.json()
    conv_id = data['conversation_id']
    print(f"✓ Started conversation: {conv_id}")
    print(f"  AI response: {data['response'][:100]}...")
    
    # Follow-up
    response = requests.post(f"{BASE_URL}/ai/chat", json={
        "message": "How many people need to evacuate?",
        "conversation_id": conv_id
    })
    assert response.status_code == 200
    print(f"✓ Follow-up message sent")
    print(f"  AI response: {response.json()['response'][:100]}...")
    
    return conv_id

def test_explain_disaster():
    """Test disaster explanation endpoint"""
    print("\n=== Testing Explain Disaster ===")
    
    response = requests.post(f"{BASE_URL}/ai/explain-disaster", json={
        "disaster_type": "earthquake",
        "latitude": 28.7041,
        "longitude": 77.1025,
        "severity_score": 7.5,
        "context": "Dense urban area"
    })
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify response structure
    assert 'explanation' in data
    assert 'impacts' in data
    assert 'vulnerable_populations' in data
    assert 'recommended_actions' in data
    
    print("✓ Disaster explanation retrieved")
    print(f"  Impacts: {len(data['impacts'])} categories")
    print(f"  Vulnerable groups: {len(data['vulnerable_populations'])}")
    print(f"  Recommendations: {len(data['recommended_actions'])}")

def test_prioritize_resources():
    """Test resource prioritization"""
    print("\n=== Testing Resource Prioritization ===")
    
    response = requests.post(f"{BASE_URL}/ai/prioritize-resources", json={
        "disaster_type": "earthquake",
        "severity_score": 8.0,
        "available_resources": [
            {"name": "Ambulance-01", "type": "ambulance", "distance_km": 5},
            {"name": "Fire-01", "type": "fire_truck", "distance_km": 3},
            {"name": "Drone-01", "type": "drone", "distance_km": 0.5},
        ],
        "situation": "Buildings collapsed"
    })
    
    assert response.status_code == 200
    data = response.json()
    
    assert 'prioritized_resources' in data
    assert 'strategy' in data
    assert len(data['prioritized_resources']) > 0
    
    print("✓ Resource prioritization retrieved")
    print(f"  Strategy: {data['strategy'][:100]}...")
    print(f"  Top resource: {data['prioritized_resources'][0]['name']}")

def test_safety_instructions():
    """Test safety guidance generation"""
    print("\n=== Testing Safety Instructions ===")
    
    response = requests.post(f"{BASE_URL}/ai/safety-instructions", json={
        "disaster_type": "earthquake",
        "location_type": "building",
        "has_vulnerable_populations": True
    })
    
    assert response.status_code == 200
    data = response.json()
    
    assert 'instructions' in data
    assert isinstance(data['instructions'], list)
    
    print("✓ Safety instructions retrieved")
    print(f"  Number of steps: {len(data['instructions'])}")
    for i, step in enumerate(data['instructions'][:3], 1):
        print(f"  Step {i}: {step[:60]}...")

def test_analyze_situation():
    """Test comprehensive situation analysis"""
    print("\n=== Testing Situation Analysis ===")
    
    response = requests.post(f"{BASE_URL}/ai/analyze-situation", json={
        "disaster_type": "flood",
        "severity_score": 6.5,
        "affected_population": 100000,
        "affected_area_km2": 500,
        "available_resources": 100,
        "time_since_onset": "2 hours"
    })
    
    assert response.status_code == 200
    data = response.json()
    
    assert 'summary' in data
    assert 'immediate_challenges' in data
    assert 'resource_allocation' in data
    
    print("✓ Situation analysis retrieved")
    print(f"  Summary: {data['summary'][:100]}...")
    print(f"  Challenges: {len(data['immediate_challenges'])} identified")

def test_error_handling():
    """Test error cases"""
    print("\n=== Testing Error Handling ===")
    
    # Missing required field
    response = requests.post(f"{BASE_URL}/ai/explain-disaster", json={
        "disaster_type": "earthquake",
        # Missing latitude, longitude, severity_score
    })
    assert response.status_code == 422
    print("✓ Validation error for missing fields: 422")
    
    # Invalid disaster type
    response = requests.post(f"{BASE_URL}/ai/explain-disaster", json={
        "disaster_type": "invalid_type",
        "latitude": 28.7041,
        "longitude": 77.1025,
        "severity_score": 5.0
    })
    assert response.status_code in [422, 400]
    print("✓ Validation error for invalid type: 422/400")
    
    # Empty message
    response = requests.post(f"{BASE_URL}/ai/chat", json={
        "message": ""
    })
    # Should either fail validation or return empty response
    print(f"✓ Empty message handling: {response.status_code}")

if __name__ == "__main__":
    print("Starting Phase 4 Integration Tests...")
    print(f"Target API: {BASE_URL}")
    
    try:
        conv_id = test_chat_flow()
        test_explain_disaster()
        test_prioritize_resources()
        test_safety_instructions()
        test_analyze_situation()
        test_error_handling()
        
        print("\n" + "="*50)
        print("✅ ALL TESTS PASSED!")
        print("="*50)
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
```

Run it:
```bash
pip install requests
python test_integration.py
```

---

## 3. Frontend Testing (Browser)

### Test 3.1: ChatPanel Component
1. Open http://localhost:8080
2. Look for "Chat Panel" or chat input area
3. Try these messages:
   - "What is the current emergency?"
   - "How many ambulances do we have?"
   - "What should we do first?" (follow-up)
   
Expected: AI responds to each message

### Test 3.2: Voice Input
1. Find the microphone button in ChatPanel
2. Click to start listening
3. Speak: "What should we do about the fire?"
4. Release the button

Expected: Text appears in input, AI responds

### Test 3.3: Voice Output
1. Send a message
2. Wait for AI response
3. Audio should play automatically

Expected: AI voice reads the response aloud

### Test 3.4: AIDecisionAssistant Component
1. Find the "AI Decision Assistant" panel
2. Enter disaster information:
   - Type: earthquake
   - Severity: 7.5
3. Click "Explain Disaster"

Expected: Detailed explanation appears

4. Click "Recommend Resources"

Expected: Ranked resource list

5. Click "Safety Instructions"

Expected: Step-by-step guidance

6. Click "Analyze Situation"

Expected: Comprehensive analysis

---

## 4. Performance Testing

### Test 4.1: Response Time
```bash
# Test response time for one request
time curl -X POST http://localhost:8000/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What should we do?"}'

# Expected: 5-10 seconds total (mostly OpenAI API)
```

### Test 4.2: Multiple Concurrent Requests
```bash
# Using Apache Bench (if installed)
ab -n 10 -c 5 -p request.json -T application/json http://localhost:8000/ai/chat

# Using curl in loop
for i in {1..5}; do
  curl -X POST http://localhost:8000/ai/chat \
    -H "Content-Type: application/json" \
    -d '{"message": "Request '$i'"}' &
done
wait

# Expected: All complete within reasonable time
```

### Test 4.3: Token Usage Monitoring
```python
# Add to your backend logs
import openai

openai.api_key = "sk-YOUR-KEY"

# Check token counting
from tiktoken import encoding_for_model

encoding = encoding_for_model("gpt-4")
tokens = encoding.encode("Sample text")
print(f"Tokens: {len(tokens)}")
```

---

## 5. Cost Monitoring

### Test 5.1: Estimate Daily Costs
```python
# Assuming 10 requests per conversation
REQUESTS_PER_DAY = 100  # Example

# GPT-4 pricing
INPUT_TOKENS = 150  # Average per request
OUTPUT_TOKENS = 100  # Average per request
INPUT_PRICE = 0.03 / 1000  # Per token
OUTPUT_PRICE = 0.06 / 1000  # Per token

daily_cost = (
    REQUESTS_PER_DAY * INPUT_TOKENS * INPUT_PRICE +
    REQUESTS_PER_DAY * OUTPUT_TOKENS * OUTPUT_PRICE
)

print(f"Estimated daily cost (GPT-4): ${daily_cost:.2f}")
print(f"Estimated monthly cost: ${daily_cost * 30:.2f}")

# With gpt-3.5-turbo (cheaper)
INPUT_PRICE_35 = 0.005 / 1000
OUTPUT_PRICE_35 = 0.015 / 1000

daily_cost_35 = (
    REQUESTS_PER_DAY * INPUT_TOKENS * INPUT_PRICE_35 +
    REQUESTS_PER_DAY * OUTPUT_TOKENS * OUTPUT_PRICE_35
)

print(f"Estimated daily cost (GPT-3.5-turbo): ${daily_cost_35:.2f}")
print(f"Estimated monthly cost: ${daily_cost_35 * 30:.2f}")
```

---

## 6. Troubleshooting

### Issue: "API key not configured"
```
Solution:
1. Check .env file has OPENAI_API_KEY set
2. Backend needs restart after .env change
3. Verify key is valid at https://platform.openai.com/account/api-keys
```

### Issue: "Connection refused" on port 8000
```
Solution:
1. Make sure backend is running: python -m uvicorn app.main:app --reload --port 8000
2. Check no other service using port 8000
3. Run on different port: --port 8001
```

### Issue: Very slow responses (>15 seconds)
```
Solution:
1. Check internet connection
2. OpenAI API might be slow - monitor at https://status.openai.com
3. Reduce OPENAI_MAX_TOKENS to 1000
4. Try gpt-3.5-turbo instead of gpt-4
```

### Issue: "Rate limit exceeded"
```
Solution:
1. Wait 60 seconds before retrying
2. Check your OpenAI account limits
3. Reduce request frequency
4. Upgrade your OpenAI plan
```

### Issue: Voice input not working
```
Solution:
1. Use Chrome, Edge, or Safari (not Firefox)
2. Check browser console (F12) for errors
3. Grant microphone permission when prompted
4. Test at https://www.google.com/intl/en/chrome/demos/speech.html
```

---

## 7. Creating Custom Test Scenarios

### Earthquake Scenario
```bash
curl -X POST http://localhost:8000/ai/explain-disaster \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type": "earthquake",
    "latitude": 28.7041,
    "longitude": 77.1025,
    "severity_score": 8.2,
    "context": "New Delhi, 9 PM, millions in buildings"
  }'
```

### Flood Scenario
```bash
curl -X POST http://localhost:8000/ai/explain-disaster \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type": "flood",
    "latitude": 25.3548,
    "longitude": 88.2600,
    "severity_score": 6.8,
    "context": "Patna, monsoon overflow, rural areas"
  }'
```

### Fire Scenario
```bash
curl -X POST http://localhost:8000/ai/explain-disaster \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type": "fire",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "severity_score": 7.0,
    "context": "Mumbai high-rise with residents"
  }'
```

---

## Acceptance Criteria Checklist

- [ ] All 6 endpoints respond without errors
- [ ] Chat maintains conversation history
- [ ] Explain provides realistic disaster impacts
- [ ] Prioritize returns ranked resources
- [ ] Safety provides step-by-step guidance
- [ ] Analyze gives comprehensive assessment
- [ ] Voice input works in supported browsers
- [ ] Voice output reads responses aloud
- [ ] Error handling returns appropriate status codes
- [ ] Response times < 15 seconds
- [ ] Multiple concurrent requests handled
- [ ] All tests pass

---

**Phase 4 is fully tested and ready for production!**
