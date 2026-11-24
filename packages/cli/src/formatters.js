/**
 * Output formatters for human-readable terminal display and JSON.
 */

export function formatBountyTable(bounties) {
  if (!Array.isArray(bounties) || bounties.length === 0) {
    return "No bounties found matching criteria.";
  }

  const rows = bounties.map((b) => {
    const repoStr = b.repo?.owner && b.repo?.name ? `${b.repo.owner}/${b.repo.name}` : "";
    const dollars = `$${((b.amount_cents || 0) / 100).toFixed(2)}`;
    const title = (b.issue_title || "").length > 40
      ? `${(b.issue_title || "").substring(0, 37)}...`
      : b.issue_title || "";

    return {
      id: b.id || "",
      repo: repoStr,
      issue: `#${b.issue_number || ""}`,
      title,
      reward: dollars,
      eligibility: b.eligibility || "either",
      status: b.status || "funded",
    };
  });

  const headers = {
    id: "ID",
    repo: "REPO",
    issue: "ISSUE",
    title: "TITLE",
    reward: "REWARD",
    eligibility: "ELIGIBILITY",
    status: "STATUS",
  };

  const colWidths = {
    id: Math.max(headers.id.length, ...rows.map((r) => r.id.length)),
    repo: Math.max(headers.repo.length, ...rows.map((r) => r.repo.length)),
    issue: Math.max(headers.issue.length, ...rows.map((r) => r.issue.length)),
    title: Math.max(headers.title.length, ...rows.map((r) => r.title.length)),
    reward: Math.max(headers.reward.length, ...rows.map((r) => r.reward.length)),
    eligibility: Math.max(headers.eligibility.length, ...rows.map((r) => r.eligibility.length)),
    status: Math.max(headers.status.length, ...rows.map((r) => r.status.length)),
  };

  const headerLine = [
    headers.id.padEnd(colWidths.id),
    headers.repo.padEnd(colWidths.repo),
    headers.issue.padEnd(colWidths.issue),
    headers.title.padEnd(colWidths.title),
    headers.reward.padStart(colWidths.reward),
    headers.eligibility.padEnd(colWidths.eligibility),
    headers.status.padEnd(colWidths.status),
  ].join("  ");

  const dividerLine = [
    "-".repeat(colWidths.id),
    "-".repeat(colWidths.repo),
    "-".repeat(colWidths.issue),
    "-".repeat(colWidths.title),
    "-".repeat(colWidths.reward),
    "-".repeat(colWidths.eligibility),
    "-".repeat(colWidths.status),
  ].join("  ");

  const rowLines = rows.map((r) =>
    [
      r.id.padEnd(colWidths.id),
      r.repo.padEnd(colWidths.repo),
      r.issue.padEnd(colWidths.issue),
      r.title.padEnd(colWidths.title),
      r.reward.padStart(colWidths.reward),
      r.eligibility.padEnd(colWidths.eligibility),
      r.status.padEnd(colWidths.status),
    ].join("  ")
  );

  return [headerLine, dividerLine, ...rowLines].join("\n");
}

export function formatBountyDetails(b) {
  const repoStr = b.repo?.owner && b.repo?.name ? `${b.repo.owner}/${b.repo.name}` : "";
  const dollars = `$${((b.amount_cents || 0) / 100).toFixed(2)}`;

  const lines = [
    `Bounty ID    : ${b.id}`,
    `Repository   : ${repoStr}`,
    `Issue        : #${b.issue_number} (${b.issue_url || ""})`,
    `Title        : ${b.issue_title || ""}`,
    `Reward       : ${dollars} (${b.amount_cents || 0} cents)`,
    `Eligibility  : ${b.eligibility || "either"}`,
    `Status       : ${b.status || "funded"}`,
  ];

  if (b.claimer) lines.push(`Claimer      : ${b.claimer}`);
  if (b.claimed_at) lines.push(`Claimed At   : ${b.claimed_at}`);
  if (b.pr_url) lines.push(`Pull Request : ${b.pr_url} (#${b.pr_number || ""})`);
  if (b.repo_clone_url) lines.push(`Clone URL    : ${b.repo_clone_url}`);
  if (b.claim_only_notes) lines.push(`Claim Notes  : ${b.claim_only_notes}`);

  if (b.acceptance_criteria) {
    lines.push("\n--- Acceptance Criteria ---");
    lines.push(b.acceptance_criteria);
  }

  if (b.issue_body) {
    lines.push("\n--- Issue Description ---");
    lines.push(b.issue_body);
  }

  return lines.join("\n");
}
