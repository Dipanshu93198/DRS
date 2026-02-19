import pytest
from app.services.ai import (
    PromptTemplate,
    get_severity_description,
    ConversationManager
)


class TestPromptTemplates:
    """Test prompt template generation"""
    
    def test_disaster_explanation_prompt(self):
        """Test disaster explanation prompt generation"""
        prompt = PromptTemplate.disaster_explanation(
            disaster_type="fire",
            latitude=28.7041,
            longitude=77.1025,
            severity_score=75.0,
            context="High wind conditions"
        )
        
        assert "fire" in prompt.lower()
        assert "28.7041" in prompt
        assert "77.1025" in prompt
        assert "HIGH" in prompt  # severity level
        assert "High wind" in prompt
    
    def test_resource_priority_prompt(self):
        """Test resource priority prompt generation"""
        resources = [
            {"name": "Ambulance-01", "type": "ambulance", "distance_km": 5.0},
            {"name": "Rescue-01", "type": "rescue", "distance_km": 8.0}
        ]
        
        prompt = PromptTemplate.resource_priority(
            disaster_type="earthquake",
            severity_score=85.0,
            available_resources=resources,
            current_situation="Multiple buildings collapsed"
        )
        
        assert "Ambulance-01" in prompt
        assert "Rescue-01" in prompt
        assert "earthquake" in prompt
        assert "Multiple buildings" in prompt
    
    def test_safety_instructions_prompt(self):
        """Test safety instructions prompt generation"""
        prompt = PromptTemplate.safety_instructions(
            disaster_type="flood",
            location_type="urban",
            has_vulnerable_populations=True
        )
        
        assert "flood" in prompt
        assert "urban" in prompt
        assert "vulnerable" in prompt.lower()
    
    def test_situation_analysis_prompt(self):
        """Test situation analysis prompt"""
        prompt = PromptTemplate.situation_analysis(
            disaster_type="fire",
            severity_score=80.0,
            affected_population=50000,
            affected_area_km2=100.0,
            available_resources=150,
            time_since_onset="2 hours"
        )
        
        assert "fire" in prompt
        assert "50000" in prompt
        assert "100.0" in prompt
        assert "2 hours" in prompt


class TestSeverityDescription:
    """Test severity level conversion"""
    
    def test_critical_severity(self):
        """Score >= 90 should be CRITICAL"""
        assert get_severity_description(95) == "CRITICAL"
        assert get_severity_description(90) == "CRITICAL"
    
    def test_severe_severity(self):
        """Score 75-89 should be SEVERE"""
        assert get_severity_description(85) == "SEVERE"
        assert get_severity_description(75) == "SEVERE"
    
    def test_moderate_severity(self):
        """Score 50-74 should be MODERATE"""
        assert get_severity_description(60) == "MODERATE"
        assert get_severity_description(50) == "MODERATE"
    
    def test_minor_severity(self):
        """Score 25-49 should be MINOR"""
        assert get_severity_description(40) == "MINOR"
        assert get_severity_description(25) == "MINOR"
    
    def test_minimal_severity(self):
        """Score < 25 should be MINIMAL"""
        assert get_severity_description(10) == "MINIMAL"
        assert get_severity_description(0) == "MINIMAL"
    
    def test_edge_cases(self):
        """Test boundary values"""
        assert get_severity_description(90) == "CRITICAL"
        assert get_severity_description(89) == "SEVERE"
        assert get_severity_description(75) == "SEVERE"
        assert get_severity_description(74) == "MODERATE"


class TestConversationManager:
    """Test conversation management"""
    
    def test_add_messages(self):
        """Test adding messages to conversation"""
        manager = ConversationManager()
        manager.add_user_message("Hello")
        manager.add_assistant_message("Hi there!")
        
        messages = manager.get_messages()
        assert len(messages) == 2
        assert messages[0]["role"] == "user"
        assert messages[0]["content"] == "Hello"
        assert messages[1]["role"] == "assistant"
        assert messages[1]["content"] == "Hi there!"
    
    def test_trim_history(self):
        """Test that conversation history is trimmed"""
        manager = ConversationManager(max_history=5)
        
        for i in range(10):
            manager.add_user_message(f"Message {i}")
        
        messages = manager.get_messages()
        assert len(messages) <= 5
    
    def test_clear_conversation(self):
        """Test clearing conversation"""
        manager = ConversationManager()
        manager.add_user_message("Test")
        manager.add_assistant_message("Response")
        
        assert len(manager.get_messages()) > 0
        
        manager.clear()
        assert len(manager.get_messages()) == 0
    
    def test_get_messages_copy(self):
        """Test that get_messages returns a copy"""
        manager = ConversationManager()
        manager.add_user_message("Test")
        
        messages = manager.get_messages()
        original_len = len(messages)
        
        # Modify returned list (shouldn't affect internal state)
        messages.append({"role": "user", "content": "Modified"})
        
        assert len(manager.get_messages()) == original_len


class TestPromptTemplateFormatting:
    """Test that prompt templates format correctly"""
    
    def test_disaster_explanation_coordinates(self):
        """Test coordinate formatting in disaster explanation"""
        prompt = PromptTemplate.disaster_explanation(
            disaster_type="earthquake",
            latitude=35.6895,
            longitude=139.6917,
            severity_score=75.0
        )
        
        # Should include properly formatted coordinates
        assert "35.6895" in prompt
        assert "139.6917" in prompt
    
    def test_resource_list_formatting(self):
        """Test resource list is properly formatted"""
        resources = [
            {"name": "Unit-A", "type": "ambulance", "distance_km": 3.5},
            {"name": "Unit-B", "type": "drone", "distance_km": 2.0}
        ]
        
        prompt = PromptTemplate.resource_priority(
            disaster_type="fire",
            severity_score=70.0,
            available_resources=resources
        )
        
        # Check resources are listed
        assert "Unit-A" in prompt
        assert "Unit-B" in prompt
        assert "ambulance" in prompt
        assert "drone" in prompt
    
    def test_context_inclusion(self):
        """Test that context is included in prompts"""
        context = "Heavy rainfall expected, flooding risk"
        
        prompt = PromptTemplate.disaster_explanation(
            disaster_type="flood",
            latitude=0,
            longitude=0,
            severity_score=50,
            context=context
        )
        
        assert context in prompt


class TestPromptTemplateVariables:
    """Test variable substitution in templates"""
    
    def test_location_variables(self):
        """Test location variable substitution"""
        lat, lon = 40.7128, -74.0060  # New York
        
        prompt = PromptTemplate.disaster_explanation(
            disaster_type="hurricane",
            latitude=lat,
            longitude=lon,
            severity_score=80.0
        )
        
        assert f"{lat:.4f}" in prompt
        assert f"{lon:.4f}" in prompt
    
    def test_numeric_variables(self):
        """Test numeric variable substitution"""
        prompt = PromptTemplate.situation_analysis(
            disaster_type="wildfire",
            severity_score=88.0,
            affected_population=250000,
            affected_area_km2=5000.0,
            available_resources=250,
            time_since_onset="4 hours"
        )
        
        assert "88.0" in prompt
        assert "250000" in prompt
        assert "5000.0" in prompt
        assert "250" in prompt
        assert "4 hours" in prompt
