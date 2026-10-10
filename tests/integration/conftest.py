import os

import pytest
from gltest import get_accounts, get_contract_factory, get_default_account

CONTRACT_PATH = "incident_triage_bounty.py"


def _address_from_env() -> str | None:
    return os.environ.get("INCIDENTTRIAGEBOUNTY_ADDRESS")


@pytest.fixture(scope="session")
def deployed_contract():
    address = _address_from_env()
    if not address:
        pytest.skip(
            "INCIDENTTRIAGEBOUNTY_ADDRESS not set - deploy first with "
            "`genlayer deploy --contract contracts/incident_triage_bounty.py` "
            "and export the printed address."
        )
    factory = get_contract_factory(contract_file_path=CONTRACT_PATH)
    return factory.build_contract(contract_address=address)


@pytest.fixture(scope="session")
def sponsor_account():
    return get_default_account()


@pytest.fixture(scope="session")
def analyst_account():
    accounts = get_accounts()
    if len(accounts) > 1:
        return accounts[1]
    from gltest import create_account

    return create_account()
