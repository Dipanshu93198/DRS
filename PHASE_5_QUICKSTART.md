# Phase 5 Quick Start Guide

**Get Citizen SOS + Real-Time Alerts Running in 5 Minutes**

---

## 📦 Prerequisites

- **Backend**: Python 3.8+, PostgreSQL 12+ with PostGIS, Redis (optional for scaling)
- **Frontend**: Node.js 16+, React 18.3.1+
- **Port**: 8000 (FastAPI), 3000 (React), 5432 (PostgreSQL)

---

## 🚀 Setup Steps

### Step 1: Backend Setup (2 minutes)

```bash
cd backend

# Create Python environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment
cp .env.example .env
# Edit .env with your database credentials

# Create database and tables
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Expected output**:
```
Uvicorn running on http://0.0.0.0:8000
Press CTRL+C to quit
```

### Step 2: Database Setup (1 minute)

```bash
# Connect to PostgreSQL
psql -U postgres -d resilience_hub

# Enable PostGIS (if not already enabled)
CREATE EXTENSION postgis;

# Verify tables created
\dt sos_*;

# Should show:
#  - sos_reports
#  - crowd_assistance
#  - alert_broadcasts
```

### Step 3: Frontend Setup (2 minutes)

```bash
cd frontend

# Install Node dependencies
npm install

# Start React dev server
npm start
```

**Expected output**:
```
Local:            http://localhost:3000
Ready in 1.2s
```

### Step 4: Test the System

**Open browser URLs**:
- **API Docs**: http://localhost:8000/docs (Swagger UI with all endpoints)
- **Frontend**: http://localhost:3000 (React app)
- **Health Check**: http://localhost:8000/sos/health

---

## 🧪 Quick Test (30 seconds)

### Test 1: Create SOS Report

```bash
curl -X POST http://localhost:8000/sos/report \
  -H "Content-Type: application/json" \
  -d '{
    "reporter_name": "John Doe",
    "reporter_phone": "+919876543210",
    "reporter_email": "john@example.com",
    "latitude": 28.7041,
    "longitude": 77.1025,
    "emergency_type": "medical",
    "description": "Person collapsed at market, unconscious",
    "severity_score": 8.5,
    "num_people_affected": 1,
    "has_injuries": 1,
    "requires_evacuation": 0,
    "is_urgent": true,
    "crowd_assistance_enabled": true
  }'
```

**Expected response** (201 Created):
```json
{
  "id": 1,
  "status": "pending",
  "reported_at": "2024-02-20T10:30:00Z",
  "reporter_name": "John Doe",
  "latitude": 28.7041,
  "longitude": 77.1025,
  ...
}
```

### Test 2: Get Active SOS

```bash
curl http://localhost:8000/sos/reports/active
```

**Expected**: Array of active SOS reports

### Test 3: Find Nearby SOS

```bash
curl "http://localhost:8000/sos/reports/nearby?latitude=28.7041&longitude=77.1025&radius_km=5"
```

**Expected**: SOS within 5km of that location

### Test 4: Get Real-Time Metrics

```bash
curl http://localhost:8000/sos/analytics
```

**Expected**:
```json
{
  "total_active_sos": 1,
  "total_resolved_today": 0,
  "average_response_time_minutes": 0,
  "most_common_emergency_type": "medical",
  "urgent_cases": 1,
  "crowd_assistance_available": 0,
  "nearby_resources_count": 0
}
```

---

## 🔌 WebSocket Real-Time Testing

### JavaScript Client Example

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/sos/ws');

ws.onopen = () => {
  console.log('Connected to SOS alerts');
  
  // Subscribe to location-based alerts (5km radius)
  ws.send(JSON.stringify({
    type: 'subscribe_location',
    latitude: 28.7041,
    longitude: 77.1025,
    radius_km: 5.0
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Alert received:', message);
  
  if (message.type === 'subscription_confirmed') {
    console.log('Subscribed to channel:', message.channel);
  }
  else if (message.type === 'sos_alert') {
    console.log(`New ${message.alert_type} emergency!`);
    // Show notification to user
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

### React Hook Usage

```typescript
import { useSOSSocket } from '@/hooks/useSOSSocket';

function AlertDashboard() {
  const { alerts, isConnected } = useSOSSocket({
    enabled: true,
    onAlert: (alert) => {
      console.log('New emergency alert:', alert);
      // Show toast/notification
    }
  });

  return (
    <div>
      {isConnected ? '✅ Connected' : '❌ Disconnected'}
      <div>{alerts.length} active emergencies</div>
      {alerts.map(alert => (
        <AlertCard key={alert.id} alert={alert} />
      ))}
    </div>
  );
}
```

---

## 📊 Frontend Components Usage

### 1. SOS Report Panel (Citizen Reporting)

```tsx
import SOSReportPanel from '@/components/SOSReportPanel';

function ReportingPage() {
  const handleReportSubmitted = (sosId: number) => {
    console.log(`SOS #${sosId} submitted`);
    // Navigate to tracking page
  };

  return (
    <SOSReportPanel
      currentLocation={{ latitude: 28.7041, longitude: 77.1025 }}
      onReportSubmitted={handleReportSubmitted}
    />
  );
}
```

### 2. Alert Center (Real-Time Dashboard)

```tsx
import AlertCenter from '@/components/AlertCenter';

function DashboardPage() {
  return (
    <AlertCenter
      autoRefresh={true}
      refreshInterval={5000}
      maxAlerts={10}
    />
  );
}
```

### 3. Crowd Assistance Panel (Volunteer Management)

```tsx
import CrowdAssistancePanel from '@/components/CrowdAssistancePanel';

function VolunteerPage({ sosId }: { sosId: number }) {
  return (
    <CrowdAssistancePanel
      sosReportId={sosId}
      maxHelpers={5}
    />
  );
}
```

---

## 🔄 Integration with Phase 3 & 4

### Phase 3: Automatic Resource Dispatch

When SOS severity ≥ 7, automatically dispatch resources:

```bash
# Get nearby emergency resources
curl "http://localhost:8000/sos/nearby-resources/1?radius_km=10"

# Returns ambulances, fire trucks, drones, etc. within 10km
```

### Phase 4: AI Analysis

High-severity SOS (8+) automatically triggers AI analysis:

```bash
# Will return AI-powered recommendations for:
# - What likely happened
# - Which resources needed
# - Public safety instructions
# - Required actions
```

---

## 📈 API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/sos/report` | Create new SOS report |
| GET | `/sos/report/{id}` | Get specific SOS |
| GET | `/sos/reports/active` | Get active SOS (realtime) |
| GET | `/sos/reports/nearby` | Geographic search |
| GET | `/sos/reports/clustered` | Clustered incidents |
| POST | `/sos/report/{id}/acknowledge` | Mark acknowledged (official) |
| POST | `/sos/report/{id}/resolve` | Mark resolved |
| POST | `/sos/assistance/offer` | Volunteer offers help |
| GET | `/sos/assistance/offers/{sos_id}` | Get volunteer offers |
| POST | `/sos/assistance/{id}/accept` | Accept volunteer |
| POST | `/sos/alert/broadcast` | Broadcast alert |
| GET | `/sos/analytics` | Real-time metrics |
| GET | `/sos/nearby-resources/{id}` | Get nearby Phase 3 resources |
| WEBSOCKET | `/sos/ws` | Real-time alert stream |

---

## 🛠️ Troubleshooting

### Server won't start

```bash
# Check Python version
python --version  # Should be 3.8+

# Reinstall dependencies
pip install -r requirements.txt --upgrade

# Check port 8000 not in use
netstat -an | grep 8000
```

### Database connection error

```bash
# Verify PostgreSQL is running
psql -U postgres -d postgres

# Check .env file
cat backend/.env

# Recreate database
dropdb resilience_hub
createdb resilience_hub
alembic upgrade head
```

### WebSocket not connecting

```bash
# Verify WebSocket endpoint exists
curl http://localhost:8000/docs

# Should show /sos/ws endpoint

# Check browser console for errors
# Common issues:
# - Firewall blocking port 8000
# - Incorrect WebSocket URL
# - Backend not running
```

### No real-time alerts showing

```bash
# Verify SOS was created
curl http://localhost:8000/sos/reports/active

# Check if you're subscribed to correct radius
# If SOS is outside your subscription radius, you won't see it

# Test with location subscription
ws.send(JSON.stringify({
  type: 'subscribe_location',
  latitude: 28.7041,
  longitude: 77.1025,
  radius_km: 50  # Large radius for testing
}));
```

---

## 📚 Next Steps

### For Development
1. Run tests: `pytest tests/test_sos_logic.py -v`
2. Check test coverage: `pytest --cov=app.services.sos`
3. View API docs: http://localhost:8000/docs
4. Load test: Use Apache JMeter with provided scenarios

### For Deployment
1. Follow [PHASE_5_CITIZEN_SOS.md](PHASE_5_CITIZEN_SOS.md) production checklist
2. Use [PHASE_5_TESTING_GUIDE.md](PHASE_5_TESTING_GUIDE.md) for full testing
3. Set up monitoring and alerting
4. Configure alert broadcasting backend (SMS, notifications)
5. Set up volunteer verification workflow

### For Integration
1. Link with Phase 3 resource dispatch
2. Connect Phase 4 AI analysis for complex incidents
3. Set up cross-phase test scenarios
4. Configure disaster hotline numbers

---

## 🎓 Key Concepts

**SOS Lifecycle**:
```
Citizen Reports (PENDING)
    ↓
Official Acknowledges (ACKNOWLEDGED)
    ↓
Resources Dispatched (IN_PROGRESS)  ← Volunteers may help here
    ↓
Incident Resolved (RESOLVED)
```

**Broadcast Scopes**:
- **Immediate**: ~500 people (immediate vicinity)
- **District**: ~50K people (police district)
- **State**: ~500K people (entire state)
- **National**: ~5M people (entire country)

**Volunteer Matching**:
- System calculates distance for each offer
- Shows ETA based on straight-line distance ÷ 40 km/h
- Citizen selects closest verified volunteer
- Volunteer gets push notification when accepted

---

## 💡 Example Workflows

### Workflow 1: Medical Emergency (2 minutes)

1. **Citizen**: Opens app, taps "Report Emergency"
2. **Citizen**: Selects "Medical", describes symptoms, confirms location
3. **System**: Broadcasts alert to immediate vicinity
4. **Volunteers**: App shows "18 nearby helpers" - Dr available, paramedic available
5. **Citizen**: Selects Dr. Sharma (3 min ETA)
6. **Official**: Gets SOS, dispatches ambulance
7. **Dr**: Arrives, provides first aid
8. **Official**: Acknowledges SOS, ambulance en route
9. **Ambulance**: Takes patient, resolves SOS

### Workflow 2: Fire Emergency (escalation)

1. **Citizen**: Reports fire with severity 9.5
2. **System**: Auto-broadcasts at "state" scope (500K people)
3. **System**: Alert triggers Phase 4 AI analysis
4. **AI**: Recommends evacuation radius, firefighting resources
5. **Official**: Dispatches fire trucks from Phase 3
6. **Volunteers**: ~200 nearby residents get alert
7. **Police**: Receives AI-powered evacuation coordinates
8. **Fire Dept**: Arrives, extinguishes fire, resolves SOS

---

## 📞 Support

**Issues**: Check [PHASE_5_TESTING_GUIDE.md](PHASE_5_TESTING_GUIDE.md) troubleshooting section

**API Documentation**: Visit http://localhost:8000/docs

**Logs**: Check stdout and PostgreSQL logs

---

**Phase 5 is live! Citizens can now directly report emergencies.**

Real-time emergency response starts here. 🚨
