import { Graph, graphSchema } from "@/components/tambo/graph";
import { CommitTimeline, commitTimelineSchema } from "@/components/tambo/commit-timeline";
import { ContributorNetwork, contributorNetworkSchema } from "@/components/tambo/contributor-network";
import { DiffViewer, diffViewerSchema } from "@/components/tambo/diff-viewer";
import { RiskHeatmap, riskHeatmapSchema } from "@/components/tambo/risk-heatmap";
import { DataCard, dataCardSchema } from "@/components/ui/card-data";
import {
  getCountryPopulations,
  getGlobalPopulationTrend,
} from "@/services/population-stats";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";
import { z } from "zod";

export const tools: TamboTool[] = [
  {
    name: "countryPopulation",
    description: "A tool to get population statistics by country with advanced filtering options",
    tool: getCountryPopulations,
    inputSchema: z.object({
      continent: z.string().optional(),
      sortBy: z.enum(["population", "growthRate"]).optional(),
      limit: z.number().optional(),
      order: z.enum(["asc", "desc"]).optional(),
    }),
    outputSchema: z.array(
      z.object({
        countryCode: z.string(),
        countryName: z.string(),
        continent: z.enum([
          "Asia",
          "Africa",
          "Europe",
          "North America",
          "South America",
          "Oceania",
        ]),
        population: z.number(),
        year: z.number(),
        growthRate: z.number(),
      }),
    ),
  },
  {
    name: "globalPopulation",
    description: "A tool to get global population trends with optional year range filtering",
    tool: getGlobalPopulationTrend,
    inputSchema: z.object({
      startYear: z.number().optional(),
      endYear: z.number().optional(),
    }),
    outputSchema: z.array(
      z.object({
        year: z.number(),
        population: z.number(),
        growthRate: z.number(),
      }),
    ),
  },
];

export const components: TamboComponent[] = [
  {
    name: "Graph",
    description: "A component that renders various types of charts (bar, line, pie) using Recharts. Supports customizable data visualization with labels, datasets, and styling options.",
    component: Graph,
    propsSchema: graphSchema,
  },
  {
    name: "DataCard",
    description: "A component that displays options as clickable cards with links and summaries with the ability to select multiple items.",
    component: DataCard,
    propsSchema: dataCardSchema,
  },
  {
    name: "CommitTimeline",
    description: "Displays a timeline of git commits grouped by month. Use this component when the user asks about commits, commit history, or repository activity. Shows commit messages, authors, dates, line changes, and file details in a visual timeline format.",
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
    description: "Displays a side-by-side or unified diff view of code changes with syntax highlighting and annotations. Use this component when showing file changes, code differences, commit diffs, or comparing code versions.",
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
