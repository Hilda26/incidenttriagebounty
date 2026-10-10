# IncidentTriageBounty

IncidentTriageBounty is a GenLayer Intelligent Contract for incident-response
workflows. A sponsor escrows a reward for the first structured triage report
that satisfies a fixed acceptance rubric for a public incident brief and
committed evidence package.

## Why this needs GenLayer

Incident triage is a judgment problem: the best report must connect symptoms,
timelines, likely cause, impact, containment, remediation, and uncertainty. A
normal deterministic contract can escrow and pay, but it cannot reliably decide
whether a proposed triage is safe, complete, and evidence-grounded. GenLayer
validators handle that semantic review while deterministic code controls money
movement and finality.

## Review-conscious design

- The judged output is only a finite `accepted` boolean plus finite
  `reason_code`; the model never chooses a recipient or amount.
- Payout always uses the stored analyst and escrowed reward.
- After the refund deadline, `review_triage` is blocked and the only successful
  path is sponsor refund through `cancel_expired_case`.
- The public incident brief, rubric, evidence commitment, and report are
  JSON-encoded as evidence-only data.
- Malformed or inconsistent verdicts mark only the report as `ERRORED`, allowing
  retry without locking the case.
- Settlement revalidates case and report state after the judged round.

## Main methods

- `create_case(incident_brief_json, acceptance_rubric_json, evidence_commitment, reward, submit_window_seconds, refund_grace_seconds)`
- `submit_triage(case_id, report_json)`
- `review_triage(report_id)`
- `cancel_expired_case(case_id)`
- `get_case(case_id)`
- `get_report(report_id)`
- `list_reports_for_case(case_id)`

## Verification

```powershell
genvm-lint check contracts\incident_triage_bounty.py --json
pytest tests\direct\ -v
```

Current result:

- GenVM lint: passed.
- Direct tests: 16 passed.
- StudioNet integration smoke test: 1 passed.

## Deployment

- StudioNet contract address: `0x44eb8fc7d93c3EF27c1e9e8a823F7CAFA8751Dec`
- Explorer: `https://explorer-studio.genlayer.com/address/0x44eb8fc7d93c3EF27c1e9e8a823F7CAFA8751Dec`
- Deployment transaction: `0xea74997ffecb8474475db9475fb5aed530238b8bc7b1892355610ad220ba334e`
- Deployment receipt: `FINALIZED`, `MAJORITY_AGREE`, leader execution `SUCCESS`,
  `stderr=""`, `raw_error=null`.
- `genlayer schema 0x44eb8fc7d93c3EF27c1e9e8a823F7CAFA8751Dec` succeeded.
- `genlayer call 0x44eb8fc7d93c3EF27c1e9e8a823F7CAFA8751Dec case_count`
  returned `0` before live tests.
- `genlayer call 0x44eb8fc7d93c3EF27c1e9e8a823F7CAFA8751Dec report_count_total`
  returned `0` before live tests.

## Live StudioNet Test

A real lifecycle test was run against the deployed contract:

- `create_case`: `0xba6ae23c7dca8543544aa602ed1029717d8fa18597ad083936cf2719441170de`
- `submit_triage`: `0x54dcd50aff4eb57c45674eced29d02477310422ba38545b5870cfdf7de6ead32`
- `review_triage`: `0x76c819f6c4ba2b352e41f45b7a2113e9e3fe7f515e45bc8bbc46cac22367c5c5`

Final state: case `0` is `AWARDED`, report `0` is `ACCEPTED`, and the
decision code is `TRIAGE_ACCEPTED`.
