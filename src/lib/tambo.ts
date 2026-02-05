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
import { DataCard, dataCardSchema } from "@/components/ui/card-data";
import {
  getCountryPopulations,
  getGlobalPopulationTrend,
} from "@/services/population-stats";
import {
  getRepoInfo,
  getRecentCommits,
  getFileContent,
  listRepoContents,
} from "@/services/github-api";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";
import { z } from "zod";

export const tools: TamboTool[] = [
  // GitHub tools
  {
    name: "getRepoInfo",
    description:
      "Get information about the currently imported GitHub repository. Returns repo name, description, default branch, stars, forks, language, and last updated date. Use this to understand what repository the user is working with.",
    tool: getRepoInfo,
    inputSchema: z.object({}),
    outputSchema: z.object({
      success: z.boolean(),
      data: z.object({
        fullName: z.string(),
        description: z.string().nullable(),
        defaultBranch: z.string(),
        stars: z.number(),
        forks: z.number(),
        language: z.string().nullable(),
        lastUpdated: z.string(),
        url: z.string(),
      }).optional(),
      error: z.string().optional(),
    }),
  },
  {
    name: "getRecentCommits",
    description:
      "Get recent commits from the currently imported GitHub repository. Returns commit SHA, message, author, date, and URL. Use this to see the latest changes and commit history.",
    tool: getRecentCommits,
    inputSchema: z.object({
      count: z.number().optional().describe("Number of commits to fetch (default: 10, max: 100)"),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      data: z.object({
        repo: z.string(),
        branch: z.string(),
        commits: z.array(z.object({
          sha: z.string(),
          message: z.string(),
          author: z.string(),
          date: z.string(),
          url: z.string(),
        })),
      }).optional(),
      error: z.string().optional(),
    }),
  },
  {
    name: "getFileContent",
    description:
      "Get the contents of a specific file from the currently imported GitHub repository. Provide the file path relative to the repository root.",
    tool: getFileContent,
    inputSchema: z.object({
      path: z.string().describe("File path relative to repository root (e.g., 'README.md', 'src/index.ts')"),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      data: z.object({
        path: z.string(),
        content: z.string(),
        size: z.number(),
      }).optional(),
      error: z.string().optional(),
    }),
  },
  {
    name: "listRepoContents",
    description:
      "List files and directories in a path of the currently imported GitHub repository. Use this to explore the repository structure.",
    tool: listRepoContents,
    inputSchema: z.object({
      path: z.string().optional().describe("Directory path to list (default: repository root)"),
    }),
    outputSchema: z.object({
      success: z.boolean(),
      data: z.object({
        path: z.string(),
        items: z.array(z.object({
          name: z.string(),
          type: z.enum(["file", "dir"]),
          path: z.string(),
          size: z.number().optional(),
        })),
      }).optional(),
      error: z.string().optional(),
    }),
  },
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
      "A component that renders various types of charts (bar, line, pie) using Recharts. Supports customizable data visualization with labels, datasets, and styling options.",
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
  // Add more components here
];
