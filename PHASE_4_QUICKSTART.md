# Phase 4 Quick Setup Guide

## 🚀 Getting Started with AI Decision Assistant (5 minutes)

### Step 1: Get OpenAI API Key (2 minutes)
```bash
# Go to: https://platform.openai.com/account/api-keys
# Create a new secret key
# Copy the key (shown only once!)
```

### Step 2: Configure Backend (1 minute)
```bash
cd resilience-hub/backend

# Copy example env file
cp .env.example .env

# Edit .env and add:
OPENAI_API_KEY=sk-YOUR-KEY-HERE
OPENAI_MODEL=gpt-4
```

### Step 3: Install Dependencies (1 minute)
```bash
pip install -r requirements.txt
```

### Step 4: Run Services (1 minute)

**Terminal 1 - Backend:**
```bash
cd resilience-hub/backend
python -m uvicorn app.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd resilience-hub
npm run dev
```

### Step 5: Test It!
- Open http://localhost:8080
- Look for "AI Assistant" panel
- Click a quick action button (Explain, Recommend, Safety, Analyze)
- Or use ChatPanel for conversation

## 📋 API Endpoints Quick Reference

### Chat (General Purpose)
```bash
POST /ai/chat
Content: {"message": "What should we do with 500 casualties?"}
```

### Explanation (Disaster Details)
```bash
POST /ai/explain-disaster
Content: {
  "disaster_type": "earthquake",
  "latitude": 28.7041,
  "longitude": 77.1025,
  "severity_score": 7.5
}
```

### Recommendations (Resource Allocation)
```bash
POST /ai/prioritize-resources
Content: {
  "disaster_type": "fire",
  "severity_score": 85,
  "available_resources": [
    {"name": "Ambulance-01", "type": "ambulance", "distance_km": 5}
  ]
}
```

### Safety (Public Guidance)
```bash
POST /ai/safety-instructions
Content: {
  "disaster_type": "flood",
  "has_vulnerable_populations": true
}
```

### Analysis (Comprehensive Assessment)
```bash
POST /ai/analyze-situation
Content: {
  "disaster_type": "earthquake",
  "severity_score": 8.0,
  "affected_population": 1000000,
  "affected_area_km2": 5000,
  "available_resources": 300,
  "time_since_onset": "2 hours"
}
```

## 🎤 Voice Commands

1. Click the **Mic button** in ChatPanel
2. Speak your question clearly
3. Release the button when done
4. AI responds and reads reply aloud

## 🧪 Quick Test Script

```bash
# Test that everything is working

# 1. Check backend health
curl http://localhost:8000/health

# 2. Test disaster explanation
curl -X POST http://localhost:8000/ai/explain-disaster \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type":"fire",
    "latitude":28.7041,
    "longitude":77.1025,
    "severity_score":75
  }'

# 3. Test resource prioritization
curl -X POST http://localhost:8000/ai/prioritize-resources \
  -H "Content-Type: application/json" \
  -d '{
    "disaster_type":"earthquake",
    "severity_score":85,
    "available_resources":[
      {"name":"Ambulance-01","type":"ambulance","distance_km":5}
    ]
  }'
```

## 🔧 Configuration Options

In `backend/.env`:
```
# OpenAI Settings
OPENAI_API_KEY=sk-...                  # Your API key
OPENAI_MODEL=gpt-4                     # gpt-3.5-turbo for cost savings
OPENAI_TEMPERATURE=0.7                 # 0-2 (lower=more deterministic)
OPENAI_MAX_TOKENS=2000                 # Max response length
```

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| "API key not configured" | Add `OPENAI_API_KEY` to `.env` |
| "API Error: 429" | Rate limited - wait a minute and retry |
| "Voice not working" | Use Chrome/Edge, grant microphone permission |
| "Slow responses" | Check internet, reduce `OPENAI_MAX_TOKENS` |
| "High costs" | Use `gpt-3.5-turbo` model instead |

## 📊 Pricing (GPT-4)

- **Input**: $0.03 per 1K tokens (~3.3¢ per 100 words)
- **Output**: $0.06 per 1K tokens (~6.6¢ per 100 words)
- **Per conversation**: ~$0.30-0.60

For cost savings, change to `gpt-3.5-turbo`:
- **Input**: $0.005 per 1K tokens
- **Output**: $0.015 per 1K tokens
- **Per conversation**: ~$0.05-0.10

## 🎯 Using in Your Application

Add to your React component:
```typescript
import { ChatPanel } from '@/components/ChatPanel';
import { AIDecisionAssistant } from '@/components/AIDecisionAssistant';

export function MyDashboard() {
  const disasterInfo = {
    disaster_type: 'earthquake',
    severity_score: 7.5,
    latitude: 28.7041,
    longitude: 77.1025
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <ChatPanel enableVoice={true} />
      <AIDecisionAssistant 
        disasterInfo={disasterInfo}
        availableResources={resources}
      />
    </div>
  );
}
```

## 📚 Full Documentation

See `PHASE_4_AI_DECISION_ASSISTANT.md` for:
- Detailed API reference
- Component documentation
- Voice integration guide
- Performance considerations
- Security guidelines
- Troubleshooting

## ✅ Verification Checklist

- [ ] OpenAI API key obtained
- [ ] `.env` file configured
- [ ] Backend dependencies installed
- [ ] Backend running on :8000
- [ ] Frontend running on :8080
- [ ] Can access http://localhost:8080
- [ ] Can see ChatPanel in UI
- [ ] Can see AIDecisionAssistant quick buttons
- [ ] Chat responds to messages
- [ ] Voice input works (optional)

## 🚀 Next Steps

1. **Integrate with Phase 3 Resources** - Use AI to recommend resources
2. **Add SOS Integration** - Have AI analyze incoming SOS reports
3. **Create Custom Prompts** - Tailor AI to your city's needs
4. **Set up Monitoring** - Track API usage and costs
5. **Fine-tune Responses** - Adjust temperatures and tokens

## 📞 Support

**For OpenAI Issues:**
- Check: https://status.openai.com
- Docs: https://platform.openai.com/docs
- Support: https://help.openai.com

**For Resilience Hub Issues:**
- Check logs: Backend console output
- Browser console: F12 in Firefox/Chrome
- API docs: http://localhost:8000/docs

---

**Phase 4 is ready to use!** 🎉

Start with simple queries and build from there. The AI gets better as it learns your disaster context.
