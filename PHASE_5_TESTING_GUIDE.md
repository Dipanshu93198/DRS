# Phase 5: Testing & Deployment Guide

**Complete testing procedures for Citizen SOS + Real-Time Alerts system**

---

## 🧪 Testing Strategy

### Test Pyramid

```
        🔺
       Tests
      /      \
     /        \
    / E2E      \
   /____________\
   /            \
  / Integration  \
 /________________\
 /                \
/ Unit Tests       \
/__________________\
  (Most tests)
```

**Distribution**:
- **70% Unit Tests** (15-20 tests): Individual service functions
- **20% Integration Tests** (5-10 tests): Cross-service workflows
- **10% E2E Tests** (2-3 tests): Full citizen → resolution flow

---

## ✅ Unit Tests

### Test Class: SOSReportCreation

Tests core SOS creation logic.

```python
pytest tests/test_sos_logic.py::TestSOSReportCreation -v
```

**Tests**:
1. `test_create_basic_sos`: Creates minimal SOS with required fields
2. `test_create_urgent_sos`: Flags urgent SOS correctly
3. `test_create_with_metadata`: Stores additional context (vulnerable_groups, hazards, access)
4. `test_default_values`: Status defaults to PENDING, created_at set
5. `test_validation_required_fields`: Requires name, location, description

**Sample Test Output**:
```
test_create_basic_sos PASSED                              [ 20%]
test_create_urgent_sos PASSED                             [ 40%]
test_create_with_metadata PASSED                          [ 60%]
test_default_values PASSED                                [ 80%]
test_validation_required_fields PASSED                    [100%]
```

### Test Class: SOSAcknowledgement

Tests SOS lifecycle state transitions.

```python
pytest tests/test_sos_logic.py::TestSOSReportAcknowledgment -v
```

**Tests**:
1. `test_acknowledge_sos`: Changes status from PENDING → ACKNOWLEDGED
2. `test_resolve_sos`: Changes status from ACKNOWLEDGED → RESOLVED
3. `test_invalid_state_transition`: Prevents invalid transitions

### Test Class: LocationSearch

Tests geospatial queries.

```python
pytest tests/test_sos_logic.py::TestSOSLocationSearch -v
```

**Tests**:
1. `test_find_nearby_sos`: Returns SOS within specified radius
2. `test_nearby_with_status_filter`: Only returns active SOS (pending, acknowledged, in_progress)
3. `test_distance_calculation`: Correctly computes Haversine distance

**Sample Data**:
```python
# Test SOS at Delhi coordinates
sos_1 = create_sos_report(
    latitude=28.7041, 
    longitude=77.1025, 
    emergency_type=EmergencyType.MEDICAL
)

# Test SOS 5km away
sos_2 = create_sos_report(
    latitude=28.7541,  # ~5km north
    longitude=77.1025,
    emergency_type=EmergencyType.ACCIDENT
)

# Should find both in 10km radius
nearby = find_nearby_sos_reports(
    28.7041, 77.1025, 
    radius_km=10
)
assert len(nearby) == 2
assert nearby[0][1] < nearby[1][1]  # First is closer
```

### Test Class: SOSClustering

Tests geographic clustering algorithm.

```python
pytest tests/test_sos_logic.py::TestSOSClustering -v
```

**Tests**:
1. `test_cluster_nearby_sos`: Groups SOS within 2km
2. `test_cluster_statistics`: Correctly computes average severity, incident types

**Clustering Example**:
```python
# Create 5 SOS in 1km² area (dense)
for i in range(5):
    create_sos_report(
        latitude=28.7041 + (i * 0.005),
        longitude=77.1025 + (i * 0.005),
        severity_score=6.0 + i
    )

clusters = cluster_sos_reports(radius_km=2.0)
assert len(clusters) == 1
assert clusters[0].num_incidents == 5
assert clusters[0].severity_average == 8.0  # (6+7+8+9+10)/5
```

### Test Class: CrowdAssistance

Tests volunteer offer creation and matching.

```python
pytest tests/test_sos_logic.py::TestCrowdAssistance -v
```

**Tests**:
1. `test_offer_assistance`: Creates volunteer offer
2. `test_distance_calculation`: Calculates distance correctly
3. `test_eta_calculation`: Estimates arrival time (assume 40 km/h)
4. `test_get_offers_by_distance`: Returns sorted by nearest first
5. `test_accept_assistance`: Marks helper as "helping"

**Example**:
```python
# Create SOS at location A
sos = create_sos_report(
    latitude=28.7041, longitude=77.1025,
    crowd_assistance_enabled=True
)

# Volunteer offers help 2km away
offer = offer_crowd_assistance(
    sos_id=sos.id,
    helper_name="Dr. Sharma",
    latitude=28.7141,  # ~2km south
    longitude=77.1025,
    assistance_type="medical_knowledge"
)

assert offer.distance_km ≈ 2.0
assert offer.estimated_arrival_min ≈ 3  # 2km / 40km/h = 3 min
```

---

## 🔄 Integration Tests

Tests workflows across multiple services.

### Test: SOS → Resource Dispatch

Tests that SOS creation triggers resource assignment.

```python
def test_sos_triggers_resource_dispatch():
    # Phase 3 integration test
    
    # 1. Create nearby resource (Phase 3)
    resource = create_resource(
        latitude=28.7050,
        longitude=77.1030,
        type=ResourceType.AMBULANCE
    )
    
    # 2. Citizen reports emergency
    sos = create_sos_report(
        latitude=28.7041,
        longitude=77.1025,
        emergency_type=EmergencyType.MEDICAL,
        severity_score=8.5
    )
    
    # 3. Verify resource auto-assigned
    resources_nearby = find_nearby_resources(
        latitude=sos.latitude,
        longitude=sos.longitude,
        radius_km=10
    )
    
    assert resource.id in [r.id for r in resources_nearby]
```

### Test: SOS → AI Analysis

Tests that high-severity SOS trigger AI analysis.

```python
def test_high_severity_sos_triggers_ai_analysis():
    # Phase 4 integration test
    
    sos = create_sos_report(
        emergency_type=EmergencyType.FIRE,
        severity_score=9.5  # High severity
    )
    
    # Get SOS with AI recommendation
    response = get_sos_report(sos.id, include_ai_analysis=True)
    
    assert response.ai_recommendation is not None
    assert "fire" in response.ai_recommendation.lower()
    assert len(response.ai_recommendation) > 50  # Meaningful analysis
```

### Test: SOS → Alert Broadcast

Tests complete alert flow.

```python
def test_alert_broadcast_reaches_audience():
    
    # 1. Create SOS
    sos = create_sos_report(
        latitude=28.7041,
        longitude=77.1025,
        severity_score=7.0  # Medium-high
    )
    
    # 2. System broadcasts alert automatically
    broadcasts = get_alert_broadcasts(sos_id=sos.id)
    
    assert len(broadcasts) >= 1
    
    # 3. Verify scope escalation
    first_broadcast = broadcasts[0]
    if sos.severity_score >= 7.0:
        assert first_broadcast.broadcast_scope in ['district', 'state']
    else:
        assert first_broadcast.broadcast_scope == 'immediate'
    
    # 4. Verify recipients
    assert first_broadcast.recipients_reached > 0
```

---

## 🧑‍💻 Manual Testing Procedures

### Test Session 1: Basic SOS Creation

**Duration**: 5 minutes
**Prerequisites**: API running on localhost:8000

**Steps**:

1. **Open API documentation**:
   ```bash
   curl http://localhost:8000/docs
   # Opens Swagger UI in browser
   ```

2. **Create test SOS**:
   ```bash
   curl -X POST http://localhost:8000/sos/report \
     -H "Content-Type: application/json" \
     -d '{
       "reporter_name": "Test User 1",
       "reporter_phone": "+919876543210",
       "reporter_email": "test@example.com",
       "latitude": 28.7041,
       "longitude": 77.1025,
       "emergency_type": "medical",
       "description": "Testing medical emergency reporting system",
       "severity_score": 5.5,
       "num_people_affected": 1,
       "has_injuries": 0,
       "requires_evacuation": 0,
       "is_urgent": false,
       "crowd_assistance_enabled": true
     }'
   ```

3. **Check response**:
   - Should receive `201 Created`
   - Response includes `id` field (e.g., `"id": 1`)
   - Status is `pending`

4. **Get SOS details**:
   ```bash
   curl http://localhost:8000/sos/report/1
   ```

5. **Expected result**: Full SOS data returned with timestamps

---

### Test Session 2: Geospatial Features

**Duration**: 10 minutes

**Setup**: Create 5 SOS reports at different locations (see script below)

**Test Part 1: Nearby Search**
```bash
# Create SOS at Delhi
curl -X POST http://localhost:8000/sos/report \
  -H "Content-Type: application/json" \
  -d '{
    "reporter_name": "Delhi Report",
    "latitude": 28.7041,
    "longitude": 77.1025,
    "emergency_type": "medical",
    "description": "Test SOS 1"
  }'

# Create SOS at Gurgaon (30km away)
curl -X POST http://localhost:8000/sos/report \
  -H "Content-Type: application/json" \
  -d '{
    "reporter_name": "Gurgaon Report",
    "latitude": 28.4595,
    "longitude": 77.0266,
    "emergency_type": "accident",
    "description": "Test SOS 2"
  }'

# Search nearby Delhi (should find SOS 1, not SOS 2)
curl "http://localhost:8000/sos/reports/nearby?latitude=28.7041&longitude=77.1025&radius_km=5"
```

**Expected result**: Only SOS 1 returned (within 5km radius)

**Test Part 2: Clustering**
```bash
# Create 3 more SOS near Delhi
for i in {3..5}; do
  curl -X POST http://localhost:8000/sos/report \
    -H "Content-Type: application/json" \
    -d "{
      \"reporter_name\": \"Cluster SOS $i\",
      \"latitude\": 28.7041,
      \"longitude\": 77.1025,
      \"emergency_type\": \"accident\",
      \"description\": \"Clustered report $i\"
    }"
done

# Get clusters
curl "http://localhost:8000/sos/reports/clustered?cluster_radius_km=2.0"
```

**Expected result**: One cluster with 4 incidents (SOS 1, 3, 4, 5 all at same location)

---

### Test Session 3: Crowd Assistance Workflow

**Duration**: 15 minutes

**Steps**:

1. **Create SOS with crowd assistance enabled**:
   ```bash
   curl -X POST http://localhost:8000/sos/report \
     -H "Content-Type: application/json" \
     -d '{
       "reporter_name": "Accident Victim",
       "latitude": 28.7041,
       "longitude": 77.1025,
       "emergency_type": "accident",
       "description": "Car accident, help needed",
       "crowd_assistance_enabled": true
     }' > /tmp/sos_response.json
   
   # Extract SOS ID
   SO_ID=$(jq '.id' /tmp/sos_response.json)
   ```

2. **Volunteer offers help (nearby)**:
   ```bash
   curl -X POST http://localhost:8000/sos/assistance/offer \
     -H "Content-Type: application/json" \
     -d "{
       \"sos_report_id\": $SOS_ID,
       \"helper_name\": \"Dr. Sharma\",
       \"helper_phone\": \"+919876543211\",
       \"latitude\": 28.7050,  # 1km away
       \"longitude\": 77.1030,
       \"assistance_type\": \"medical_knowledge\",
       \"description\": \"I'm a doctor nearby\"
     }" > /tmp/offer_response.json
   
   # Extract offer ID
   OFFER_ID=$(jq '.id' /tmp/offer_response.json)
   ```

3. **Check offer shows correct distance/ETA**:
   ```bash
   curl "http://localhost:8000/sos/assistance/offers/$SOS_ID" | jq '.[] | {distance_km, estimated_arrival_min}'
   ```

   **Expected output**:
   ```json
   {
     "distance_km": 1.0,
     "estimated_arrival_min": 2
   }
   ```

4. **Accept the volunteer offer**:
   ```bash
   curl -X POST "http://localhost:8000/sos/assistance/$OFFER_ID/accept"
   ```

   **Expected**: Status changes to `"accepted"`, `accepted_at` timestamp added

---

### Test Session 4: Alert Broadcasting

**Duration**: 10 minutes

**Steps**:

1. **Create high-severity SOS** (should trigger district broadcast):
   ```bash
   curl -X POST http://localhost:8000/sos/report \
     -H "Content-Type: application/json" \
     -d '{
       "reporter_name": "Fire Reporter",
       "latitude": 28.7041,
       "longitude": 77.1025,
       "emergency_type": "fire",
       "description": "Building fire, evacuate area",
       "severity_score": 9.0,
       "is_urgent": true
     }' | jq '.id' > /tmp/sos_id.txt
   
   SOS_ID=$(cat /tmp/sos_id.txt)
   ```

2. **Check automatic broadcast**:
   ```bash
   curl "http://localhost:8000/sos/alert?sos_report_id=$SOS_ID" | jq '.'
   ```

   **Expected**: Alert created with:
   - `alert_type`: `new_sos`
   - `broadcast_scope`: `district` or higher (due to severity 9.0)
   - `recipients_reached`: ~50,000 (district scope)

3. **Manual escalation**:
   ```bash
   curl -X POST http://localhost:8000/sos/alert/broadcast \
     -H "Content-Type: application/json" \
     -d "{
       \"sos_report_id\": $SOS_ID,
       \"alert_type\": \"status_update\",
       \"message\": \"Fire contained, emergency continues\",
       \"broadcast_scope\": \"state\"
     }"
   ```

   **Expected**: New alert with state scope (~500K recipients)

---

### Test Session 5: Analytics

**Duration**: 5 minutes

**Steps**:

1. **Get real-time analytics**:
   ```bash
   curl http://localhost:8000/sos/analytics | jq '.'
   ```

   **Expected output**:
   ```json
   {
     "total_active_sos": 3,
     "total_resolved_today": 5,
     "average_response_time_minutes": 4.2,
     "most_common_emergency_type": "medical",
     "urgent_cases": 1,
     "crowd_assistance_available": 8,
     "nearby_resources_count": 12
   }
   ```

2. **Dashboard interpretation**:
   - `total_active_sos`: Current emergencies needing attention
   - `average_response_time`: How fast are we responding?
   - `most_common_emergency_type`: Resource planning hint
   - `urgent_cases`: Immediate high-priority count

---

## 🎬 Frontend Component Testing

### Testing SOSReportPanel

Using React Testing Library:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SOSReportPanel from '@/components/SOSReportPanel';

describe('SOSReportPanel', () => {
  
  it('renders form fields correctly', () => {
    render(<SOSReportPanel />);
    
    expect(screen.getByLabelText(/reporter name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/latitude/i)).toBeInTheDocument();
  });
  
  it('submits form and calls onReportSubmitted', async () => {
    const onReportSubmitted = jest.fn();
    render(<SOSReportPanel onReportSubmitted={onReportSubmitted} />);
    
    // Fill form
    await userEvent.type(
      screen.getByLabelText(/reporter name/i),
      'Test User'
    );
    await userEvent.type(
      screen.getByLabelText(/phone/i),
      '+919876543210'
    );
    // ... fill other fields
    
    // Submit
    fireEvent.click(screen.getByText(/submit/i));
    
    // Wait for callback
    await waitFor(() => {
      expect(onReportSubmitted).toHaveBeenCalledWith(expect.any(Number));
    });
  });
});
```

### Testing AlertCenter

```typescript
it('auto-refreshes alerts every 5 seconds', async () => {
  const { rerender } = render(<AlertCenter refreshInterval={5000} />);
  
  // Should fetch on mount
  expect(fetch).toHaveBeenCalled();
  
  // Advance 5 seconds
  jest.advanceTimersByTime(5000);
  
  // Should fetch again
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('shows loading state while fetching', () => {
  // Mock slow API
  jest.spyOn(global, 'fetch').mockImplementation(
    () => new Promise(() => {}) // Never resolves
  );
  
  render(<AlertCenter />);
  
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
```

---

## ⚡ Performance Testing

### Load Testing with Apache JMeter

**Scenario**: 100 concurrent users creating SOS reports

**Setup**:
```jmx
<ThreadGroup guiclass="ThreadGroupGui" testname="Load Test - SOS Creation">
  <elementProp name="ThreadGroup.main_controller">
    <intProp name="ThreadGroup.num_threads">100</intProp>
    <intProp name="ThreadGroup.ramp_time">10</intProp>
  </elementProp>
</ThreadGroup>
```

**Expected Results**:
- Avg response time: < 200ms
- 95th percentile: < 500ms
- Error rate: < 1%
- Throughput: > 50 requests/second

### Database Query Performance

```sql
-- Check if geospatial indexes exist
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename = 'sos_reports';

-- Explain plan for nearby search
EXPLAIN ANALYZE
SELECT *, ST_Distance(geom, ST_Point(77.1025, 28.7041, 4326)) / 1000 as distance_km
FROM sos_reports
WHERE ST_DWithin(geom, ST_Point(77.1025, 28.7041, 4326), 5000)
AND status IN ('pending', 'acknowledged', 'in_progress')
ORDER BY distance_km
LIMIT 50;

-- Expected: Index Scan using gist_sos_reports_geom
-- Planning Time: < 1ms
-- Execution Time: < 50ms
```

---

## 🐛 Debugging Common Issues

### Issue: "WebSocket connection refused"

**Cause**: WebSocket endpoint not implemented

**Solution**:
```python
# In app/routers/sos.py, add:

@app.websocket("/sos/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # Process subscription request
            # Broadcast alert messages
    except WebSocketDisconnect:
        pass
```

### Issue: "Clustering returns empty results"

**Cause**: No SOS within cluster radius

**Solution**:
```bash
# Check manual: Do you have 2+ SOS within 2km?
curl "http://localhost:8000/sos/reports/active" | jq '.[] | {id, latitude, longitude}'

# Calculate distances manually:
# Distance = sqrt((lat2-lat1)^2 + (lon2-lon1)^2) * 111km/degree
```

### Issue: "Volunteer distance incorrect"

**Cause**: Haversine formula not used consistently

**Debug**:
```python
from app.services.dispatch import haversine_distance

dist = haversine_distance(
    lat1=28.7041, lon1=77.1025,  # SOS
    lat2=28.7050, lon2=77.1030   # Volunteer
)
print(f"Distance: {dist:.2f} km")  # Should be ~1.0 km
```

---

## 📋 Pre-Deployment Checklist

- [ ] All unit tests pass: `pytest tests/test_sos_logic.py -v`
- [ ] Integration tests pass: `pytest tests/test_integration_sos.py -v`
- [ ] Frontend components render: `npm test`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] API documentation complete: `GET /docs`
- [ ] Database migrations ready: `alembic status`
- [ ] WebSocket endpoint implemented: `GET /sos/ws`
- [ ] Rate limiting configured (prevent spam SOS)
- [ ] Alert broadcasting backend configured
- [ ] Volunteer verification workflow ready
- [ ] Admin dashboard for emergency officials created
- [ ] Monitoring/alerting set up for high-volume SOS

---

## 📞 Support Escalation Path

1. **Local issues** → Check unit tests
2. **Integration issues** → Run integration tests
3. **API issues** → Check `/docs` Swagger UI
4. **Database issues** → Run `psql` queries manually
5. **Frontend issues** → Check browser console
6. **WebSocket issues** → Check WebSocket server logs

---

**Execute this testing plan before going live!**

Each test session builds on previous ones, progressing from basic SOS creation to complex integrated workflows.
