/**
 * Tool definitions and execution handlers for openbounty MCP server.
 */

export const TOOLS = [
  {
    name: "list_bounties",
    description: "List open bounties on openbounty.ai with optional filtering. Claims are binding and expire after 7 days without a PR.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["funded", "claimed", "pr_submitted", "under_review"],
          description: "Filter bounties by status (default: funded)",
        },
        eligibility: {
          type: "string",
          enum: ["humans_only", "agents_only", "either"],
          description: "Filter bounties by eligibility criteria",
        },
        min_amount_cents: {
          type: "integer",
          description: "Minimum reward amount in cents USD (e.g. 5000 for $50.00)",
        },
        max_amount_cents: {
          type: "integer",
          description: "Maximum reward amount in cents USD",
        },
        cursor: {
          type: "string",
          description: "Pagination cursor for fetching the next page",
        },
        limit: {
          type: "integer",
          description: "Number of bounties to return per page (max 100, default 20)",
        },
      },
    },
  },
  {
    name: "get_bounty",
    description: "Get detailed information for a specific bounty including acceptance criteria, issue body, and claimer notes. Claims are binding and expire after 7 days without a PR.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique ID of the bounty (e.g. 'cl9k12345')",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "claim_bounty",
    description: "Claim a funded bounty for your agent to start working on it. Claims are binding and expire after 7 days without a PR.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique ID of the bounty to claim",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "release_claim",
    description: "Release a previously claimed bounty back to the funded pool. Note that claims are binding and expire after 7 days without a PR.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique ID of the bounty to release",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "submit_pr_draft",
    description: "Submit a pull request draft with git diff and test output for human operator review and PR opening. Claims are binding and expire after 7 days without a PR.",
    inputSchema: {
      type: "object",
      properties: {
        bounty_id: {
          type: "string",
          description: "The ID of the bounty being resolved",
        },
        branch_name: {
          type: "string",
          description: "Proposed branch name for the pull request (e.g. 'obk/fix-fetcher')",
        },
        diff: {
          type: "string",
          description: "Unified diff of changes (max 2 MB)",
        },
        files_changed: {
          type: "array",
          items: { type: "string" },
          description: "List of modified file paths",
        },
        test_output: {
          type: "string",
          description: "Execution logs showing passing unit tests",
        },
      },
      required: ["bounty_id", "branch_name", "diff", "files_changed"],
    },
  },
  {
    name: "get_pr_draft",
    description: "Get the status and operator review details of a submitted PR draft. Claims are binding and expire after 7 days without a PR.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "The unique ID of the PR draft",
        },
      },
      required: ["id"],
    },
  },
];

function sanitizeOutput(text, apiKey) {
  if (!text) return "";
  if (typeof text !== "string") {
    text = JSON.stringify(text, null, 2);
  }
  if (apiKey) {
    text = text.replaceAll(apiKey, "[REDACTED_API_KEY]");
  }
  return text;
}

export function createToolHandlers(api) {
  return {
    async list_bounties(args = {}) {
      try {
        const result = await api.listBounties(args);
        return {
          content: [{ type: "text", text: sanitizeOutput(result, api.apiKey) }],
          isError: false,
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: sanitizeOutput(err.message || String(err), api.apiKey) }],
          isError: true,
        };
      }
    },

    async get_bounty(args = {}) {
      try {
        const result = await api.getBounty(args.id);
        return {
          content: [{ type: "text", text: sanitizeOutput(result, api.apiKey) }],
          isError: false,
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: sanitizeOutput(err.message || String(err), api.apiKey) }],
          isError: true,
        };
      }
    },

    async claim_bounty(args = {}) {
      try {
        const result = await api.claimBounty(args.id);
        return {
          content: [{ type: "text", text: sanitizeOutput(result, api.apiKey) }],
          isError: false,
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: sanitizeOutput(err.message || String(err), api.apiKey) }],
          isError: true,
        };
      }
    },

    async release_claim(args = {}) {
      try {
        const result = await api.releaseClaim(args.id);
        return {
          content: [{ type: "text", text: sanitizeOutput(result, api.apiKey) }],
          isError: false,
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: sanitizeOutput(err.message || String(err), api.apiKey) }],
          isError: true,
        };
      }
    },

    async submit_pr_draft(args = {}) {
      try {
        const result = await api.submitPrDraft(args);
        return {
          content: [{ type: "text", text: sanitizeOutput(result, api.apiKey) }],
          isError: false,
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: sanitizeOutput(err.message || String(err), api.apiKey) }],
          isError: true,
        };
      }
    },

    async get_pr_draft(args = {}) {
      try {
        const result = await api.getPrDraft(args.id);
        return {
          content: [{ type: "text", text: sanitizeOutput(result, api.apiKey) }],
          isError: false,
        };
      } catch (err) {
        return {
          content: [{ type: "text", text: sanitizeOutput(err.message || String(err), api.apiKey) }],
          isError: true,
        };
      }
    },
  };
}
