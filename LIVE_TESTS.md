# Live StudioNet Test Evidence

Live lifecycle tests were run against the deployed IncidentTriageBounty contract
on October 10, 2026.

## Contract

- Address: `0x44eb8fc7d93c3EF27c1e9e8a823F7CAFA8751Dec`
- Explorer: `https://explorer-studio.genlayer.com/address/0x44eb8fc7d93c3EF27c1e9e8a823F7CAFA8751Dec`

## Command

```powershell
node live_studionet_incident_tests.mjs --out C:\contracts\incident-live-studionet-latest.json
```

## Real Transactions

- `create_case`: `0xba6ae23c7dca8543544aa602ed1029717d8fa18597ad083936cf2719441170de`
- `submit_triage`: `0x54dcd50aff4eb57c45674eced29d02477310422ba38545b5870cfdf7de6ead32`
- `review_triage`: `0x76c819f6c4ba2b352e41f45b7a2113e9e3fe7f515e45bc8bbc46cac22367c5c5`

Every transaction receipt returned:

- `statusName`: `ACCEPTED`
- `resultName`: `MAJORITY_AGREE`
- Leader execution: `SUCCESS`
- `stdout`: empty
- `stderr`: empty
- `rawError`: `null`

## Final On-Chain State

- `caseId`: `0`
- `reportId`: `0`
- Final case state: `AWARDED`
- Winner: `0xD2674bc0A4F386EF71E874413D8f172608d76cCe`
- Decision code: `TRIAGE_ACCEPTED`
- Final report status: `ACCEPTED`
- Final `case_count`: `1`
- Final `report_count_total`: `1`

