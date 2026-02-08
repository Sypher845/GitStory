import { CommitTimeline, commitTimelineSchema } from "@/components/tambo/commit-timeline";
import { ContributorNetwork, contributorNetworkSchema } from "@/components/tambo/contributor-network";
import { PRSummary, prSummarySchema } from "@/components/tambo/pr-summary";
import { RepoSummary, repoSummarySchema } from "@/components/tambo/repo-summary";
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

DO NOT USE for: commit history (use CommitTimeline), file analysis (use RiskHeatmap)`,
    component: ContributorNetwork,
    propsSchema: contributorNetworkSchema,
  },

  {
    name: "PRSummary",
    description: `A comprehensive pull request summary card showing PR metadata, stats, reviewers, and file changes.

⚠️ CRITICAL: YOU MUST CALL MCP TOOLS TO FETCH REAL PR DATA ⚠️
- ALWAYS call github__get_pull_request or github__list_pull_requests to get REAL PR data
- NEVER fabricate, guess, or hallucinate PR titles, descriptions, reviewers, or file changes
- ALL PR data MUST come from actual MCP tool responses

TRIGGER KEYWORDS: "pull request", "PR", "merge request", "code review", "PR summary", "review", "PR details", "open PRs", "pull requests"

DO NOT USE for: Commit history (use CommitTimeline), Code quality metrics (use RiskHeatmap)`,
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

DO NOT USE for: Commit history (use CommitTimeline), PR information (use PRSummary)

FEATURES:
- Sortable by risk score, churn, or complexity
- Filterable by risk threshold (high/medium/low)  
- Shows file path, risk score, recent changes, and complexity metrics`,
    component: RiskHeatmap,
    propsSchema: riskHeatmapSchema,
  },
  {
    name: "RepoSummary",
    description: `A comprehensive repository summary showing overview information, stats, topics, and folder structure.

⚠️ CRITICAL: YOU MUST CALL MCP TOOLS TO FETCH REAL REPOSITORY DATA ⚠️
- ALWAYS call github__get_repository to get REAL repository metadata
- ALWAYS call github__get_repository_content to get REAL folder structure
- NEVER fabricate, guess, or hallucinate repository names, descriptions, or file structures
- ALL data displayed MUST come from actual MCP tool responses

TRIGGER KEYWORDS: "repository summary", "repo summary", "what is this repo", "describe repo", "repository overview", "project overview", "folder structure", "project structure", "explain codebase", "what does this project do", "summarize repo", "about this repository"

MANDATORY WORKFLOW:
1. FIRST: Call github__get_repository(owner, repo) to get repository metadata (name, description, stars, forks, language, topics)
2. SECOND: Call github__get_repository_content(owner, repo, path="") to get root folder structure
3. THIRD: For key directories (src, lib, components), call github__get_repository_content to get their contents
4. FOURTH: Render RepoSummary with the data including structure with descriptions

STRUCTURE FORMAT:
- Each folder/file needs: path, type ("file" or "directory"), and optional description
- Provide meaningful descriptions based on common conventions (e.g., "src" = "Source code", "package.json" = "Project dependencies")

DO NOT USE for: Commit history (use CommitTimeline), PR information (use PRSummary), Contributors (use ContributorNetwork)`,
    component: RepoSummary,
    propsSchema: repoSummarySchema,
  },
];
