/**
 * @file tambo.ts
 * @description Central configuration file for Tambo components and tools
 *
 * This file serves as the central place to register your Tambo components and tools.
 * It exports arrays that will be used by the TamboProvider.
 *
 * Read more about Tambo at https://tambo.co/docs
 */

import { Graph, graphSchema } from "@/components/tambo/graph";
import { CommitTimeline, commitTimelineSchema } from "@/components/tambo/commit-timeline";
import { ContributorNetwork, contributorNetworkSchema } from "@/components/tambo/contributor-network";
import { DataCard, dataCardSchema } from "@/components/ui/card-data";
import {
  getCountryPopulations,
  getGlobalPopulationTrend,
} from "@/services/population-stats";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";
import { z } from "zod";

// Note: GitHub tools are now provided via the GitHub MCP Server
// See src/services/github-mcp.ts for the MCP configuration

export const tools: TamboTool[] = [
  // Population Statistics Tools (demo)
  {
    name: "countryPopulation",
    description:
      "A tool to get population statistics by country with advanced filtering options",
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
    description:
      "A tool to get global population trends with optional year range filtering",
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
  // Add more tools here
];

/**
 * components
 *
 * This array contains all the Tambo components that are registered for use within the application.
 * Each component is defined with its name, description, and expected props. The components
 * can be controlled by AI to dynamically render UI elements based on user interactions.
 */
export const components: TamboComponent[] = [
  {
    name: "Graph",
    description:
      "A component that renders various types of charts (bar, line, pie) using Recharts. Use for visualizing numerical data, trends, comparisons, and statistics. Do NOT use this for showing contributors or team members - use ContributorNetwork for that instead.",
    component: Graph,
    propsSchema: graphSchema,
  },
  {
    name: "DataCard",
    description:
      "A component that displays options as clickable cards with links and summaries with the ability to select multiple items.",
    component: DataCard,
    propsSchema: dataCardSchema,
  },
  {
    name: "CommitTimeline",
    description:
      "A component that displays a timeline of git commits grouped by month. Use when the user asks to see commit history, git log, repository activity, or wants to visualize changes over time. IMPORTANT: You MUST call get_commit for EACH commit to get the stats (additions/deletions) and files array - the list_commits endpoint does NOT include this data. Shows commit messages, authors, dates, line changes (+added/-removed), and expandable file change details.",
    component: CommitTimeline,
    propsSchema: commitTimelineSchema,
  },
  {
    name: "ContributorNetwork",
    description:
      "ALWAYS use this component when showing repository contributors, team members, or people who worked on the project. Displays an interactive SVG network graph with circular nodes for each contributor showing their commit count, plus a sidebar with detailed stats. Use this instead of Graph/bar charts when showing contributor information.",
    component: ContributorNetwork,
    propsSchema: contributorNetworkSchema,
  },
  // Add more components here
];

