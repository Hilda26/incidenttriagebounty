import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const keytar = require("C:/Users/HP/AppData/Roaming/npm/node_modules/genlayer/node_modules/keytar");

const sdk = await import(
  "file:///C:/Users/HP/AppData/Roaming/npm/node_modules/genlayer/node_modules/genlayer-js/dist/index.js"
);
const chains = await import(
  "file:///C:/Users/HP/AppData/Roaming/npm/node_modules/genlayer/node_modules/genlayer-js/dist/chains/index.js"
);

const CONTRACT_ADDRESS = "0x44eb8fc7d93c3EF27c1e9e8a823F7CAFA8751Dec";
const SPONSOR_ACCOUNT = "briefbond-freelancer";
const ANALYST_ACCOUNT = "briefbond-trigger";

const INCIDENT_BRIEF = JSON.stringify({
  incident_id: "LIVE-INC-2026-10",
  system: "checkout-api",
  symptoms: ["elevated 5xx errors", "checkout latency above SLO", "payment queue backlog"],
  known_facts: [
    "deploy completed at 09:05 UTC",
    "database CPU saturated after deploy",
    "rollback reduced 5xx rate",
    "no customer payment data is included in this public brief",
  ],
  scope: "public, non-secret incident summary",
});

const ACCEPTANCE_RUBRIC = JSON.stringify({
  must: [
    "identify plausible root cause",
    "state severity and customer impact",
    "include containment steps",
    "include remediation and verification steps",
    "state uncertainty and missing evidence",
  ],
  reject_if: [
    "unsafe remediation",
    "unsupported root cause",
    "missing critical risk",
    "timeline absent",
  ],
});

const GOOD_REPORT = JSON.stringify({
  summary: "Checkout API degradation followed the 09:05 UTC deploy and recovered after rollback.",
  root_cause: "A deployed query path likely caused database CPU saturation and queue buildup.",
  severity: "High customer-facing impact because checkout requests returned elevated 5xx errors.",
  timeline: ["09:05 deploy", "09:12 5xx spike", "09:20 queue backlog", "09:25 rollback", "09:34 recovery"],
  containment: ["keep rollback in place", "pause the risky deploy", "watch queue depth and DB CPU"],
  remediation: [
    "inspect slow query logs",
    "add index or rewrite the expensive query",
    "load test before redeploy",
    "add alerting for DB CPU, queue depth, and checkout 5xx",
  ],
  uncertainties: ["exact SQL statement still needs confirmation from committed evidence bundle"],
});

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || idx === process.argv.length - 1) return fallback;
  return process.argv[idx + 1];
}

async function getClient(accountName) {
  const privateKey = await keytar.getPassword("genlayer-cli", `account:${accountName}`);
  if (!privateKey) {
    throw new Error(`Account ${accountName} is not unlocked in the OS keychain.`);
  }
  const account = sdk.createAccount(privateKey);
  const client = sdk.createClient({ chain: chains.studionet, account });
  await client.initializeConsensusSmartContract();
  return { client, account, accountName };
}

function serialize(value) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Map) {
    return Object.fromEntries(Array.from(value.entries()).map(([key, val]) => [key, serialize(val)]));
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, serialize(val)]));
  }
  return value;
}

function summarizeReceipt(label, hash, receipt) {
  const leader = receipt.consensus_data?.leader_receipt?.[0] ?? {};
  const genvm = leader.genvm_result ?? {};
  const statusName = receipt.status_name ?? receipt.statusName ?? String(receipt.status ?? "");
  const resultName = receipt.result_name ?? receipt.resultName ?? String(receipt.result ?? "");
  const summary = {
    label,
    hash,
    statusName,
    resultName,
    leaderExecution: leader.execution_result ?? "",
    stdout: genvm.stdout ?? "",
    stderr: genvm.stderr ?? "",
    rawError: genvm.raw_error ?? null,
  };
  const okStatus = ["FINALIZED", "ACCEPTED"].some((needle) => String(statusName).toUpperCase().includes(needle));
  if (!okStatus || summary.leaderExecution === "ERROR" || summary.stderr || summary.rawError) {
    throw new Error(`${label} failed receipt checks: ${JSON.stringify(summary)}`);
  }
  return summary;
}

async function writeTx(client, label, functionName, args, value = 0n) {
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    retries: 120,
    interval: 5000,
  });
  const summary = summarizeReceipt(label, hash, receipt);
  console.log(JSON.stringify(summary));
  return summary;
}

async function readCall(client, functionName, args = []) {
  return serialize(
    await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName,
      args,
    }),
  );
}

async function main() {
  const outPath = argValue("--out", `C:/contracts/incident-live-studionet-${Date.now()}.json`);
  const sponsor = await getClient(SPONSOR_ACCOUNT);
  const analyst = await getClient(ANALYST_ACCOUNT);

  const beforeCaseCount = Number(await readCall(sponsor.client, "case_count"));
  const beforeReportCount = Number(await readCall(sponsor.client, "report_count_total"));
  const caseId = beforeCaseCount;
  const reportId = beforeReportCount;
  const suffix = `${Date.now()}-${caseId}`;

  const records = [
    {
      label: "initial-read-counts",
      caseCount: beforeCaseCount,
      reportCount: beforeReportCount,
      sponsor: sponsor.account.address,
      analyst: analyst.account.address,
    },
  ];

  records.push(
    await writeTx(
      sponsor.client,
      "create-case",
      "create_case",
      [
        INCIDENT_BRIEF,
        ACCEPTANCE_RUBRIC,
        `sha256:live-incident-triage-${suffix}`,
        1,
        3600,
        3600,
      ],
      1n,
    ),
  );

  records.push({ label: "after-create-get-case", caseId, case: await readCall(sponsor.client, "get_case", [caseId]) });

  records.push(
    await writeTx(
      analyst.client,
      "submit-good-triage",
      "submit_triage",
      [caseId, GOOD_REPORT],
    ),
  );

  records.push({
    label: "after-submit-get-report",
    reportId,
    report: await readCall(sponsor.client, "get_report", [reportId]),
  });

  records.push(
    await writeTx(
      sponsor.client,
      "review-good-triage",
      "review_triage",
      [reportId],
    ),
  );

  const finalCase = await readCall(sponsor.client, "get_case", [caseId]);
  const finalReport = await readCall(sponsor.client, "get_report", [reportId]);
  const finalCaseCount = Number(await readCall(sponsor.client, "case_count"));
  const finalReportCount = Number(await readCall(sponsor.client, "report_count_total"));

  records.push({ label: "final-get-case", caseId, case: finalCase });
  records.push({ label: "final-get-report", reportId, report: finalReport });
  records.push({ label: "final-read-counts", caseCount: finalCaseCount, reportCount: finalReportCount });

  if (finalCase.state !== "AWARDED") {
    throw new Error(`Expected final case state AWARDED, got ${finalCase.state}`);
  }
  if (String(finalCase.winner).toLowerCase() !== String(analyst.account.address).toLowerCase()) {
    throw new Error(`Expected winner ${analyst.account.address}, got ${finalCase.winner}`);
  }
  if (finalCase.decision_code !== "TRIAGE_ACCEPTED") {
    throw new Error(`Expected TRIAGE_ACCEPTED, got ${finalCase.decision_code}`);
  }
  if (finalReport.status !== "ACCEPTED") {
    throw new Error(`Expected final report ACCEPTED, got ${finalReport.status}`);
  }
  if (finalCaseCount !== beforeCaseCount + 1) {
    throw new Error(`Expected case_count ${beforeCaseCount + 1}, got ${finalCaseCount}`);
  }
  if (finalReportCount !== beforeReportCount + 1) {
    throw new Error(`Expected report_count_total ${beforeReportCount + 1}, got ${finalReportCount}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    contractAddress: CONTRACT_ADDRESS,
    caseId,
    reportId,
    passed: true,
    records,
  };
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ outPath, passed: true, caseId, reportId, totalRecords: records.length }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
