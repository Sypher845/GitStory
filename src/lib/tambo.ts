import { CommitTimeline, commitTimelineSchema } from "@/components/tambo/commit-timeline";
import { ContributorNetwork, contributorNetworkSchema } from "@/components/tambo/contributor-network";
import { DiffViewer, diffViewerSchema } from "@/components/tambo/diff-viewer";
import { RiskHeatmap, riskHeatmapSchema } from "@/components/tambo/risk-heatmap";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";

export const tools: TamboTool[] = [];

export const components: TamboComponent[] = [
  {
    name: "CommitTimeline",
    description: "Displays a timeline of git commits grouped by month. Use this component when the user asks about commits, commit history, or repository activity. CRITICAL: You MUST fetch and include the 'files' array (path, added, removed) for every commit. If the initial commit list doesn't have file stats, you MUST fetch commit details to get them. Do not show '0 files changed' unless it's true.",
    component: CommitTimeline,
    propsSchema: commitTimelineSchema,
  },
  {
    name: "ContributorNetwork",
    description: "Displays an interactive network graph showing repository contributors with their commit counts. Use this component when showing contributors, team members, or people who worked on the project.",
    component: ContributorNetwork,
    propsSchema: contributorNetworkSchema,
  },
  {
    name: "DiffViewer",
    description: `Displays a diff view showing what changed IN a specific commit.

CRITICAL RULES:
1. beforeCode = file BEFORE commit (at parent SHA)
2. afterCode = file AFTER commit (at commit SHA)
3. NEVER use "^" or "~1" syntax - resolve the actual parent SHA first via commit list/details.

WORKFLOW:
1. Get commit details to find parent SHA (e.g., commit abc123 has parent def456)
2. Try to fetch file at PARENT SHA for beforeCode
3. Try to fetch file at COMMIT SHA for afterCode
4. IMMEDIATELY render DiffViewer with whatever you have

IF FILE FETCH FAILS:
- DO NOT RETRY the same call
- Use "" (empty string) for that version
- Still render DiffViewer with fileName so user sees helpful error
- Example: If both fail, call DiffViewer with fileName="lib/lexer.cpp", commitHash="5cb2663", beforeCode="", afterCode=""

VALID STATES:
- Both empty + fileName = shows "content unavailable" message (OK!)
- beforeCode empty = file was ADDED
- afterCode empty = file was DELETED
- Both have content = normal diff

MAX 1 ATTEMPT PER FILE. If github__get_file_contents fails, STOP and use empty string.`,
    component: DiffViewer,
    propsSchema: diffViewerSchema,
  },
  {
    name: "RiskHeatmap",
    description: "Displays a risk heatmap of repository files showing risk scores based on churn, complexity, test coverage, and recent changes. Use this component when the user asks about risky files, code health, technical debt, bug-prone areas, or which files need attention. Supports sorting by risk/churn/complexity and filtering by threshold level.",
    component: RiskHeatmap,
    propsSchema: riskHeatmapSchema,
  },
];
