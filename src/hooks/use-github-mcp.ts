"use client";

import { useEffect, useState } from "react";
import type { McpServerInfo } from "@tambo-ai/react";
import { MCPTransport } from "@tambo-ai/react";

interface GitHubMcpConfig {
    owner: string | null;
    repo: string | null;
    accessToken: string | null;
}

// Hook to dynamically configure GitHub MCP server based on selected repo
export function useGitHubMcp(): McpServerInfo[] {
    const [config, setConfig] = useState<GitHubMcpConfig>({
        owner: null,
        repo: null,
        accessToken: null,
    });

    useEffect(() => {
        if (typeof window === "undefined") return;

        const loadState = () => {
            try {
                const savedRepo = localStorage.getItem("gitstory-repo");
                if (savedRepo) {
                    const parsed = JSON.parse(savedRepo);
                    setConfig((prev) => ({
                        ...prev,
                        owner: parsed.owner || null,
                        repo: parsed.repo || null,
                    }));
                }

                const savedAuth = localStorage.getItem("gitstory-auth");
                if (savedAuth) {
                    const parsed = JSON.parse(savedAuth);
                    setConfig((prev) => ({
                        ...prev,
                        accessToken: parsed.accessToken || null,
                    }));
                }
            } catch (e) {
                console.error("Failed to load GitStory state:", e);
            }
        };

        loadState();

        const handleRepoChange = (event: CustomEvent<{ owner: string; repo: string } | null>) => {
            if (event.detail) {
                setConfig((prev) => ({
                    ...prev,
                    owner: event.detail!.owner,
                    repo: event.detail!.repo,
                }));
            } else {
                setConfig((prev) => ({ ...prev, owner: null, repo: null }));
            }
        };

        const handleAuthChange = (event: CustomEvent<{ isAuthenticated: boolean }>) => {
            if (!event.detail.isAuthenticated) {
                setConfig((prev) => ({ ...prev, accessToken: null }));
            } else {
                try {
                    const savedAuth = localStorage.getItem("gitstory-auth");
                    if (savedAuth) {
                        const parsed = JSON.parse(savedAuth);
                        setConfig((prev) => ({ ...prev, accessToken: parsed.accessToken || null }));
                    }
                } catch (e) {
                    console.error("Failed to reload auth:", e);
                }
            }
        };

        window.addEventListener("gitstory-repo-changed", handleRepoChange as EventListener);
        window.addEventListener("gitstory-auth-changed", handleAuthChange as EventListener);

        return () => {
            window.removeEventListener("gitstory-repo-changed", handleRepoChange as EventListener);
            window.removeEventListener("gitstory-auth-changed", handleAuthChange as EventListener);
        };
    }, []);

    const mcpServers: McpServerInfo[] = [];

    if (config.accessToken && config.owner && config.repo) {
        mcpServers.push({
            url: "https://api.githubcopilot.com/mcp/",
            transport: MCPTransport.HTTP,
            name: "github",
            customHeaders: {
                Authorization: `Bearer ${config.accessToken}`,
            },
        } as McpServerInfo);
    }

    return mcpServers;
}

// Get current repo info
export function useGitHubRepoInfo() {
    const [repoInfo, setRepoInfo] = useState<{
        owner: string | null;
        repo: string | null;
        fullName: string | null;
    }>({
        owner: null,
        repo: null,
        fullName: null,
    });

    useEffect(() => {
        if (typeof window === "undefined") return;

        const loadRepo = () => {
            try {
                const savedRepo = localStorage.getItem("gitstory-repo");
                if (savedRepo) {
                    const parsed = JSON.parse(savedRepo);
                    setRepoInfo({
                        owner: parsed.owner || null,
                        repo: parsed.repo || null,
                        fullName: parsed.owner && parsed.repo ? `${parsed.owner}/${parsed.repo}` : null,
                    });
                }
            } catch (e) {
                console.error("Failed to load repo info:", e);
            }
        };

        loadRepo();

        const handleRepoChange = (event: CustomEvent<{ owner: string; repo: string } | null>) => {
            if (event.detail) {
                setRepoInfo({
                    owner: event.detail.owner,
                    repo: event.detail.repo,
                    fullName: `${event.detail.owner}/${event.detail.repo}`,
                });
            } else {
                setRepoInfo({ owner: null, repo: null, fullName: null });
            }
        };

        window.addEventListener("gitstory-repo-changed", handleRepoChange as EventListener);
        return () => {
            window.removeEventListener("gitstory-repo-changed", handleRepoChange as EventListener);
        };
    }, []);

    return repoInfo;
}

// Context helpers for Tambo AI
export const gitStoryContextHelpers = {
    currentRepo: () => {
        if (typeof window === "undefined") {
            return { key: "currentRepo", value: "No repo selected" };
        }

        try {
            const savedRepo = localStorage.getItem("gitstory-repo");
            if (savedRepo) {
                const parsed = JSON.parse(savedRepo);
                if (parsed.owner && parsed.repo) {
                    return {
                        key: "currentRepo",
                        value: `${parsed.owner}/${parsed.repo}${parsed.branch ? ` (branch: ${parsed.branch})` : ""}`,
                    };
                }
            }
        } catch {
            // ignore
        }

        return { key: "currentRepo", value: "No repo selected" };
    },

    userContext: () => ({
        key: "userContext",
        value: "Developer investigating Git history and codebase evolution",
    }),
};
