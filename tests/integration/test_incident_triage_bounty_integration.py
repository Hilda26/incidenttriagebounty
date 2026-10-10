import pytest

pytestmark = pytest.mark.integration


def test_deployed_schema_exposes_incident_triage_bounty_surface(deployed_contract):
    assert int(deployed_contract.case_count(args=[]).call()) >= 0
    assert int(deployed_contract.report_count_total(args=[]).call()) >= 0
