"""
Quick integration test script
Tests all agents are working correctly
"""
import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from agents.temporal_agent import TemporalAgent
from agents.visual_agent import VisualAgent
from agents.risk_scorer_agent import RiskScorerAgent
from agents.remediation_agent import RemediationAgent
from agents.documentation_agent import DocumentationAgent
from agents.orchestrator import Orchestrator
from utils.mock_data import generate_crypto_mining_scenario


async def test_agents():
    """Test all agents individually"""
    print("🧪 Testing Nova Sentinel Agents...\n")
    
    # Test data
    events = generate_crypto_mining_scenario()
    
    # Test 1: Temporal Agent
    print("1️⃣  Testing Temporal Agent (Nova 2 Lite)...")
    try:
        temporal = TemporalAgent()
        timeline = await temporal.analyze_timeline(events, "Cryptocurrency Mining Attack")
        print(f"   ✅ Temporal Agent: SUCCESS - {len(timeline.events)} events analyzed")
    except Exception as e:
        print(f"   ❌ Temporal Agent: FAILED - {e}")
    
    # Test 2: Risk Scorer
    print("\n2️⃣  Testing Risk Scorer (Nova Micro)...")
    try:
        risk_scorer = RiskScorerAgent()
        risk = await risk_scorer.score_event_risk(events[0])
        print(f"   ✅ Risk Scorer: SUCCESS - Risk level: {risk.get('risk_level', 'UNKNOWN')}")
    except Exception as e:
        print(f"   ❌ Risk Scorer: FAILED - {e}")
    
    # Test 3: Remediation Agent
    print("\n3️⃣  Testing Remediation Agent (Nova 2 Lite)...")
    try:
        remediation = RemediationAgent()
        timeline_data = {
            "root_cause": "IAM role compromise",
            "attack_pattern": "Privilege escalation",
            "blast_radius": "17 resources",
            "events": events[:3]
        }
        plan = await remediation.generate_remediation_plan(
            incident_analysis={"timeline": timeline_data},
            root_cause=timeline_data["root_cause"],
            attack_pattern=timeline_data["attack_pattern"],
            blast_radius=timeline_data["blast_radius"],
            timeline_events=timeline_data["events"]
        )
        print(f"   ✅ Remediation Agent: SUCCESS - Plan generated")
    except Exception as e:
        print(f"   ❌ Remediation Agent: FAILED - {e}")
    
    # Test 4: Documentation Agent
    print("\n4️⃣  Testing Documentation Agent (Nova Act)...")
    try:
        doc_agent = DocumentationAgent()
        docs = await doc_agent.generate_documentation(
            incident_id="TEST-001",
            incident_analysis={"severity": "CRITICAL"},
            timeline={"root_cause": "Test", "attack_pattern": "Test", "blast_radius": "Test", "events": []},
            remediation_plan={"plan": {"plan": []}}
        )
        print(f"   ✅ Documentation Agent: SUCCESS - Documentation generated for {len(docs.get('platforms', []))} platforms")
    except Exception as e:
        print(f"   ❌ Documentation Agent: FAILED - {e}")
    
    # Test 5: Orchestrator
    print("\n5️⃣  Testing Orchestrator (Multi-Agent)...")
    try:
        orchestrator = Orchestrator()
        result = await orchestrator.analyze_incident(
            events=events,
            diagram_data=None,
            incident_type="Cryptocurrency Mining Attack"
        )
        print(f"   ✅ Orchestrator: SUCCESS")
        print(f"      - Incident ID: {result['incident_id']}")
        print(f"      - Status: {result['status']}")
        print(f"      - Agents: {list(result['agents'].keys())}")
        print(f"      - Analysis Time: {result['analysis_time_ms']}ms")
    except Exception as e:
        print(f"   ❌ Orchestrator: FAILED - {e}")
        import traceback
        traceback.print_exc()
    
    print("\n✅ Integration test complete!")


if __name__ == "__main__":
    asyncio.run(test_agents())
