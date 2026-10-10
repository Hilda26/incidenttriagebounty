# IncidentTriageBounty Design Notes

## Core Flow

1. The sponsor creates a public incident case and escrows the full reward.
2. The case stores a non-secret incident brief, acceptance rubric, and evidence
   commitment.
3. Analysts submit structured JSON triage reports.
4. Anyone may review a pending or errored report before the refund deadline.
5. GenLayer validators decide whether the report satisfies the fixed rubric.
6. Accepted reports pay the stored analyst and terminally award the case.
7. Rejected reports leave the case open for other analysts.
8. After the refund deadline, review is blocked and anyone may trigger sponsor
   refund.

## Equivalence Principle

Validators compare only:

```json
{"accepted": true, "reason_code": "TRIAGE_ACCEPTED"}
```

or:

```json
{"accepted": false, "reason_code": "<finite rejection code>"}
```

Allowed rejection codes are `MISSING_CRITICAL_RISK`,
`UNSUPPORTED_ROOT_CAUSE`, `UNSAFE_REMEDIATION`, `INCOMPLETE_TIMELINE`, and
`MALFORMED_TRIAGE`.

## Consequence Boundary

The model cannot set a recipient, amount, case id, or report id. Accepted
verdicts pay `report.analyst` exactly `case.reward`; refunds pay `case.sponsor`.

## Reusability

The primitive can be reused for software outages, security incidents, data
quality incidents, governance incident reports, SRE postmortem triage, vendor
incident analysis, or any workflow where public evidence can be committed and a
human-quality report needs validator agreement before payout.
