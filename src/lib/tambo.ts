import { CommitTimeline, commitTimelineSchema } from "@/components/tambo/commit-timeline";
import { ContributorNetwork, contributorNetworkSchema } from "@/components/tambo/contributor-network";
import { DiffViewer, diffViewerSchema } from "@/components/tambo/diff-viewer";
import { PRSummary, prSummarySchema } from "@/components/tambo/pr-summary";
import { RiskHeatmap, riskHeatmapSchema } from "@/components/tambo/risk-heatmap";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";

export const tools: TamboTool[] = [];

export const components: TamboComponent[] = [
  {
    name: "CommitTimeline",
    description: `A visual timeline displaying git commits organized by month with expandable file details.

⚠️ CRITICAL: YOU MUST CALL MCP TOOLS TO FETCH REAL COMMIT DATA ⚠️
- ALWAYS call github__list_commits to get REAL commit history
- NEVER fabricate, guess, or hallucinate commit messages, authors, or file changes
- NEVER make up commits based on repository name or assumptions
- ALL data displayed MUST come from actual MCP tool responses

TRIGGER KEYWORDS: "commits", "commit history", "recent commits", "what changed", "changelog", "activity", "updates", "repository history", "git log", "show commits", "list commits", "explore repository", "explore this repo"

MANDATORY WORKFLOW:
1. FIRST: Call github__list_commits(owner, repo) to get REAL commit list
2. SECOND: For each commit, call github__get_commit(owner, repo, sha) to get file details if not included
3. THIRD: Render CommitTimeline with ONLY the data returned by MCP tools
4. NEVER add commits that weren't in the API response

CRITICAL DATA REQUIREMENTS:
- MUST fetch and include 'files' array (path, added, removed) for EVERY commit
- If initial commit list lacks file stats, MUST call github__get_commit for details
- Never show "0 files changed" unless genuinely true per API response
- Include repoUrl for GitHub links to work

IF API RETURNS NO COMMITS:
- Show empty state message
- Do NOT invent sample commits`,
    component: CommitTimeline,
    propsSchema: commitTimelineSchema,
  },
  {
    name: "ContributorNetwork",
    description: `An interactive network graph visualizing repository contributors and their connections.

⚠️ CRITICAL: YOU MUST CALL MCP TOOLS TO FETCH REAL CONTRIBUTOR DATA ⚠️
- ALWAYS call github__list_commits or appropriate MCP tool to get REAL contributor data
- NEVER fabricate, guess, or hallucinate contributor names, emails, or commit counts
- ALL contributor data MUST come from actual MCP tool responses

TRIGGER KEYWORDS: "contributors", "who contributed", "team", "authors", "developers", "maintainers", "who worked on", "committers", "people", "collaboration"

DO NOT USE for: commit history (use CommitTimeline), code changes (use DiffViewer), file analysis (use RiskHeatmap)`,
    component: ContributorNetwork,
    propsSchema: contributorNetworkSchema,
  },
  {
    name: "DiffViewer",
    description: `A side-by-side or unified code diff viewer showing exactly what changed in a specific file within a commit.

⚠️ CRITICAL: YOU MUST FETCH REAL DIFF DATA - NEVER FABRICATE CODE ⚠️
- NEVER fabricate, guess, or hallucinate code content
- NEVER make up code based on filename or repository name
- If MCP tools don't return file content, report this to the user instead of inventing code

TRIGGER KEYWORDS: "diff", "show diff", "view diff", "what changed in file", "code changes", "file changes", "compare", "before and after", "line changes"

RECOMMENDED WORKFLOW (Use github__get_commit with include_diff):
1. Call github__get_commit(owner, repo, sha, include_diff=true)
2. The response includes a "files" array with each file's "patch" field containing the unified diff
3. Parse the patch to extract before/after content, OR
4. Tell the user to view the diff on GitHub directly if patch content is not available

ALTERNATIVE WORKFLOW (If get_file_contents returns actual content):
1. Get the commit details to find the parent SHA
2. Call github__get_file_contents(owner, repo, path, sha=PARENT_SHA) for beforeCode
3. Call github__get_file_contents(owner, repo, path, sha=COMMIT_SHA) for afterCode
4. Render with the ACTUAL returned content

IF MCP RETURNS METADATA ONLY (no actual file text):
- DO NOT render DiffViewer with hallucinated code
- Instead, tell the user: "I fetched the commit metadata (file: X, +Y/-Z lines) but the actual file content is not available in this environment. You can view the full diff at: [GitHub commit URL]"
- Provide the GitHub link: https://github.com/{owner}/{repo}/commit/{sha}

VALID STATES FOR RENDERING:
- Both empty + fileName = shows "content unavailable" (OK!)
- beforeCode empty = file was ADDED (new file)
- afterCode empty = file was DELETED
- Both have REAL fetched content = normal diff comparison`,
    component: DiffViewer,
    propsSchema: diffViewerSchema,
  },
  {
    name: "PRSummary",
    description: `A comprehensive pull request summary card showing PR metadata, stats, reviewers, and file changes.

⚠️ CRITICAL: YOU MUST CALL MCP TOOLS TO FETCH REAL PR DATA ⚠️
- ALWAYS call github__get_pull_request or github__list_pull_requests to get REAL PR data
- NEVER fabricate, guess, or hallucinate PR titles, descriptions, reviewers, or file changes
- ALL PR data MUST come from actual MCP tool responses

TRIGGER KEYWORDS: "pull request", "PR", "merge request", "code review", "PR summary", "review", "PR details", "open PRs", "pull requests"

DO NOT USE for: Commit history (use CommitTimeline), Single file diffs (use DiffViewer), Code quality metrics (use RiskHeatmap)`,
    component: PRSummary,
    propsSchema: prSummarySchema,
  },
  {
    name: "RiskHeatmap",
    description: `A heatmap visualization showing file-level risk scores based on code churn, complexity, and change frequency.

⚠️ CRITICAL: YOU MUST CALL MCP TOOLS TO FETCH REAL FILE DATA ⚠️
- ALWAYS call github__list_commits and analyze REAL commit data for risk calculation
- NEVER fabricate, guess, or hallucinate file names, risk scores, or change frequencies
- Risk scores MUST be calculated from actual commit/file data from MCP responses
- If you cannot fetch file data, show an error - do NOT make up risk metrics

TRIGGER KEYWORDS: "risk", "risky files", "code health", "technical debt", "bug-prone", "hotspots", "complexity", "churn", "trouble areas", "problematic files", "code quality", "needs attention", "code smells"

DO NOT USE for: Commit history (use CommitTimeline), Specific file diffs (use DiffViewer), PR information (use PRSummary)

FEATURES:
- Sortable by risk score, churn, or complexity
- Filterable by risk threshold (high/medium/low)  
- Shows file path, risk score, recent changes, and complexity metrics`,
    component: RiskHeatmap,
    propsSchema: riskHeatmapSchema,
  },
];
