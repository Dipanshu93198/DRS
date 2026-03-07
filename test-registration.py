#!/usr/bin/env python3
"""
Test registration endpoint
"""
import requests
import json

# Test data
test_data = {
    "name": "Test Citizen",
    "email": "test@example.com",
    "password": "test123",
    "role": "citizen"
}

try:
    response = requests.post(
        "http://localhost:8000/auth/register",
        json=test_data,
        headers={"Content-Type": "application/json"}
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")

    if response.status_code == 200:
        print("✅ Registration successful!")
    else:
        print("❌ Registration failed")

except requests.exceptions.ConnectionError:
    print("❌ Cannot connect to backend. Is it running?")
except Exception as e:
    print(f"❌ Error: {e}")
