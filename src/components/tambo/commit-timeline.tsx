"use client";

import { useState, useCallback } from "react";
import { ChevronRight, ExternalLink, Github, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTamboThreadInput } from "@tambo-ai/react";
import { z } from "zod";

const FileChangeSchema = z.object({
    path: z.string().describe("The file path that was changed, e.g., 'src/auth/index.ts'"),
    added: z.number().optional().default(0).describe("Number of lines added"),
    removed: z.number().optional().default(0).describe("Number of lines removed"),
});

const CommitSchema = z.object({
    id: z.string().describe("Unique identifier for the commit (use the full SHA)"),
    message: z.string().describe("Commit message describing the change, e.g., 'feat: Add user authentication'"),
    hash: z.string().describe("Short git commit hash (first 7 chars), e.g., 'abc123d'"),
    author: z.string().describe("Name of the commit author"),
    date: z.string().describe("Human-readable date, e.g., 'Jan 15' or 'Dec 28'"),
    added: z.number().optional().default(0).describe("Total lines added"),
    removed: z.number().optional().default(0).describe("Total lines removed"),
    tag: z.string().optional().describe("Optional tag"),
    files: z.array(FileChangeSchema).optional().default([]).describe("List of files changed"),
});

const MonthGroupSchema = z.object({
    month: z.string().describe("Month and year label, e.g., 'January 2024'"),
    commits: z.array(CommitSchema).describe("Commits in this month"),
});

export const commitTimelineSchema = z.object({
    data: z.array(MonthGroupSchema).describe("Array of month groups containing commits"),
    repoUrl: z.string().optional().describe("GitHub repository URL, e.g., 'https://github.com/owner/repo'"),
}).describe("Displays a timeline of git commits grouped by month");

interface FileChange {
    path: string;
    added: number;
    removed: number;
}

interface Commit {
    id: string;
    message: string;
    hash: string;
    author: string;
    date: string;
    added: number;
    removed: number;
    tag?: string;
    files: FileChange[];
}

interface MonthGroup {
    month: string;
    commits: Commit[];
}

interface CommitTimelineProps {
    data?: MonthGroup[];
    repoUrl?: string;
}

// Threshold for "large" file changes (files with many line changes)
const LARGE_CHANGE_THRESHOLD = 500;
const MAX_FILES_TO_SHOW = 15;

// Generate GitHub URL for a file at a specific commit
function getGitHubFileUrl(repoUrl: string | undefined, commitId: string, filePath: string): string | null {
    if (!repoUrl) return null;
    const cleanUrl = repoUrl.replace(/\/$/, ''); // Remove trailing slash
    return `${cleanUrl}/blob/${commitId}/${filePath}`;
}

export function CommitTimeline({ data, repoUrl }: CommitTimelineProps) {
    const [filter, setFilter] = useState<"all" | "tagged">("all");
    const [expandedCommit, setExpandedCommit] = useState<string | null>(null);
    const [loadingFile, setLoadingFile] = useState<string | null>(null);
    const [loadingHeatmap, setLoadingHeatmap] = useState<string | null>(null);

    // Get Tambo thread input to send messages
    const { setValue, submit } = useTamboThreadInput();

    // Handle file click - auto-send a message to view the diff
    const handleFileClick = useCallback(async (file: FileChange, commit: Commit) => {
        // Prevent double-clicks
        if (loadingFile) return;

        const fileKey = `${commit.id}-${file.path}`;
        setLoadingFile(fileKey);

        try {
            // Compose a message asking for the diff
            const message = `Show me the diff for "${file.path}" in commit ${commit.hash}`;

            // Set the message and submit it
            setValue(message);

            // Small delay to ensure value is set
            await new Promise(resolve => setTimeout(resolve, 50));

            // Auto-submit the message
            await submit({ streamResponse: true, resourceNames: {} });
        } catch (error) {
            console.error("Failed to send diff request:", error);
        } finally {
            setLoadingFile(null);
        }
    }, [setValue, submit, loadingFile]);

    // Trigger risk heatmap for a commit
    const triggerRiskHeatmap = async (e: React.MouseEvent, commitHash: string, commitMessage: string) => {
        e.stopPropagation();
        setLoadingHeatmap(commitHash);
        try {
            setValue(`Show risk heatmap analysis for commit ${commitHash} — "${commitMessage}"`);
            await new Promise(resolve => setTimeout(resolve, 50));
            await submit({ streamResponse: true, resourceNames: {} });
        } catch (err) {
            console.error("Failed to trigger risk heatmap:", err);
        } finally {
            setLoadingHeatmap(null);
        }
    };

    // Handle undefined data during streaming
    if (!data || data.length === 0) {
        return (
            <div className="rounded-xl p-8" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
                <div className="animate-pulse">
                    <div className="h-8 w-48 bg-gray-5 rounded mb-4" />
                    <div className="h-4 w-64 bg-gray-5 rounded mb-8" />
                    <div className="space-y-4">
                        <div className="h-24 bg-gray-5 rounded" />
                        <div className="h-24 bg-gray-5 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    // Safely calculate tagged count - handle undefined commits during streaming
    const taggedCount = data.reduce(
        (acc, month) => acc + (month.commits?.filter((c) => c?.tag)?.length ?? 0),
        0
    );
    const totalCommits = data.reduce(
        (acc, month) => acc + (month.commits?.length ?? 0),
        0
    );

    // Filter data safely - handle undefined commits
    const filteredData = data
        .filter((month) => month.commits && Array.isArray(month.commits))
        .map((month) => ({
            ...month,
            commits: month.commits.filter((commit) => {
                if (!commit) return false;
                if (filter === "tagged") return commit.tag;
                return true;
            }),
        }))
        .filter((month) => month.commits.length > 0);

    // Calculate metrics based on filtered data
    const filteredTotalAdded = filteredData.reduce(
        (acc, month) =>
            acc + month.commits.reduce((sum, c) => sum + (c?.added ?? 0), 0),
        0
    );
    const filteredTotalRemoved = filteredData.reduce(
        (acc, month) =>
            acc + month.commits.reduce((sum, c) => sum + (c?.removed ?? 0), 0),
        0
    );
    const filteredContributors = new Set(
        filteredData.flatMap((month) => month.commits.map((c) => c?.author).filter(Boolean))
    ).size;

    return (
        <div className="rounded-xl p-8" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
            {/* Header */}
            <div className="mb-6">
                <h1 style={{ color: "#e6edf3", marginBottom: "0.5rem" }}>Commit Timeline</h1>
                <p style={{ color: "#7d8590", fontSize: "0.875rem" }}>
                    {totalCommits} commits across {data.length} {data.length === 1 ? 'month' : 'months'}
                </p>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-8">
                <button
                    onClick={() => setFilter("all")}
                    className="px-4 py-1.5 rounded-md transition-colors"
                    style={{
                        backgroundColor: filter === "all" ? "#238636" : "#21262d",
                        color: filter === "all" ? "#ffffff" : "#7d8590",
                        border: "1px solid #30363d",
                    }}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter("tagged")}
                    className="px-4 py-1.5 rounded-md transition-colors flex items-center gap-2"
                    style={{
                        backgroundColor: filter === "tagged" ? "#238636" : "#21262d",
                        color: filter === "tagged" ? "#ffffff" : "#7d8590",
                        border: "1px solid #30363d",
                    }}
                >
                    Tagged
                    <span
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{ backgroundColor: "#30363d", color: "#7d8590" }}
                    >
                        {taggedCount}
                    </span>
                </button>
            </div>

            {/* Timeline */}
            <div className="space-y-8">
                {filteredData.map((monthGroup, monthIndex) => (
                    <div key={`${monthGroup.month}-${monthIndex}`}>
                        {/* Month Badge */}
                        <div className="inline-block px-4 py-2 rounded-md mb-4" style={{ backgroundColor: "#21262d", border: "1px solid #30363d" }}>
                            <span style={{ color: "#7d8590" }}>{monthGroup.month}</span>
                        </div>

                        {/* Commits */}
                        <div className="relative">
                            {/* Vertical Line */}
                            <div
                                className="absolute left-2 top-0 bottom-0 w-0.5"
                                style={{
                                    background: "linear-gradient(180deg, #238636 0%, #3fb950 50%, #238636 100%)",
                                    boxShadow: "0 0 8px rgba(35, 134, 54, 0.4)"
                                }}
                            />

                            {/* Commit Cards */}
                            <div className="space-y-4">
                                {monthGroup.commits.map((commit, commitIndex) => {
                                    // Skip incomplete commits during streaming
                                    if (!commit || !commit.id) return null;

                                    return (
                                        <div key={`${commit.id}-${commitIndex}`} className="relative pl-10">
                                            {/* Timeline Dot */}
                                            <div
                                                className="absolute left-0 top-6 w-4 h-4 rounded-full border-2"
                                                style={{
                                                    backgroundColor: "#0d1117",
                                                    borderColor: "#238636",
                                                    boxShadow: "0 0 6px rgba(35, 134, 54, 0.3)",
                                                }}
                                            />

                                            {/* Commit Card */}
                                            <div
                                                className="rounded-lg p-4 transition-colors hover:bg-opacity-80 cursor-pointer"
                                                style={{
                                                    backgroundColor: "#0d1117",
                                                    border: "1px solid #30363d",
                                                }}
                                                onClick={() => setExpandedCommit(expandedCommit === commit.id ? null : commit.id)}
                                            >
                                                {/* Tag */}
                                                {commit.tag && (
                                                    <div className="mb-2">
                                                        <span
                                                            className="inline-block px-2 py-1 rounded text-xs"
                                                            style={{
                                                                backgroundColor: commit.tag === "breaking-change" ? "#6e3708" : "#3d1f00",
                                                                color: "#f2cc60",
                                                                border: "1px solid #9e6a03",
                                                            }}
                                                        >
                                                            {commit.tag}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex-1">
                                                        {/* Commit Message */}
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <motion.div
                                                                animate={{ rotate: expandedCommit === commit.id ? 90 : 0 }}
                                                                transition={{ duration: 0.2 }}
                                                            >
                                                                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#7d8590" }} />
                                                            </motion.div>
                                                            <h3 style={{ color: "#e6edf3" }}>
                                                                {commit.message}
                                                            </h3>
                                                        </div>

                                                        {/* Meta Info */}
                                                        <div className="flex items-center gap-3 text-sm ml-6" style={{ color: "#7d8590" }}>
                                                            <span style={{ fontFamily: "var(--font-family-mono)" }}>{commit.hash}</span>
                                                            <span>•</span>
                                                            <span>{commit.author}</span>
                                                            <span>•</span>
                                                            <span>{commit.date}</span>
                                                        </div>
                                                    </div>

                                                    {/* Stats */}
                                                    <div className="flex items-center gap-4 flex-shrink-0">
                                                        <div className="text-right">
                                                            <div style={{ color: "#3fb950" }}>
                                                                +{commit.added}
                                                            </div>
                                                            <div className="text-xs" style={{ color: "#7d8590" }}>
                                                                added
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div style={{ color: "#f85149" }}>
                                                                -{commit.removed}
                                                            </div>
                                                            <div className="text-xs" style={{ color: "#7d8590" }}>
                                                                removed
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Risk Heatmap Button */}
                                                <div className="mt-2 flex justify-end">
                                                    <button
                                                        onClick={(e) => triggerRiskHeatmap(e, commit.hash, commit.message)}
                                                        disabled={loadingHeatmap === commit.hash}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all"
                                                        style={{
                                                            backgroundColor: loadingHeatmap === commit.hash ? "rgba(218, 54, 51, 0.15)" : "rgba(218, 54, 51, 0.08)",
                                                            color: loadingHeatmap === commit.hash ? "#f85149" : "#f0883e",
                                                            border: `1px solid ${loadingHeatmap === commit.hash ? "#da3633" : "rgba(218, 54, 51, 0.3)"}`,
                                                            cursor: loadingHeatmap === commit.hash ? "wait" : "pointer",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            if (loadingHeatmap !== commit.hash) {
                                                                e.currentTarget.style.backgroundColor = "rgba(218, 54, 51, 0.18)";
                                                                e.currentTarget.style.borderColor = "#da3633";
                                                                e.currentTarget.style.color = "#f85149";
                                                            }
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            if (loadingHeatmap !== commit.hash) {
                                                                e.currentTarget.style.backgroundColor = "rgba(218, 54, 51, 0.08)";
                                                                e.currentTarget.style.borderColor = "rgba(218, 54, 51, 0.3)";
                                                                e.currentTarget.style.color = "#f0883e";
                                                            }
                                                        }}
                                                    >
                                                        {loadingHeatmap === commit.hash ? (
                                                            <motion.div
                                                                animate={{ rotate: 360 }}
                                                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                            >
                                                                <Shield className="w-3.5 h-3.5" />
                                                            </motion.div>
                                                        ) : (
                                                            <Shield className="w-3.5 h-3.5" />
                                                        )}
                                                        Risk
                                                    </button>
                                                </div>

                                                {/* Accordion - File Changes */}
                                                <AnimatePresence>
                                                    {expandedCommit === commit.id && (
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: "auto", opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                                            style={{ overflow: "hidden" }}
                                                        >
                                                            <div className="mt-4 pt-4" style={{ borderTop: "1px solid #30363d" }}>
                                                                {(commit.added > 0 || commit.removed > 0) && (!commit.files || commit.files.length === 0) ? (
                                                                    <div className="text-sm mb-3 italic" style={{ color: "#e09e13" }}>
                                                                        File details not available for this commit (+{commit.added} / -{commit.removed} lines changed)
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-sm mb-3" style={{ color: "#7d8590" }}>
                                                                        {commit.files?.length ?? 0} {(commit.files?.length ?? 0) === 1 ? 'file' : 'files'} changed
                                                                        {(commit.files?.length ?? 0) > MAX_FILES_TO_SHOW && (
                                                                            <span style={{ color: "#f0c541" }}> (showing first {MAX_FILES_TO_SHOW})</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <div className="space-y-2">
                                                                    {(commit.files ?? []).slice(0, MAX_FILES_TO_SHOW).map((file, idx) => {
                                                                        if (!file) return null;
                                                                        const fileKey = `${commit.id}-${file.path}`;
                                                                        const isLoading = loadingFile === fileKey;
                                                                        const totalChanges = (file.added || 0) + (file.removed || 0);
                                                                        const isLargeFile = totalChanges > LARGE_CHANGE_THRESHOLD;
                                                                        const githubUrl = getGitHubFileUrl(repoUrl, commit.id, file.path);

                                                                        return (
                                                                            <motion.div
                                                                                key={idx}
                                                                                initial={{ x: -10, opacity: 0 }}
                                                                                animate={{ x: 0, opacity: 1 }}
                                                                                transition={{ duration: 0.2, delay: idx * 0.05 }}
                                                                                className={`flex items-center justify-between p-3 rounded-md ${!isLargeFile ? 'cursor-pointer group' : ''}`}
                                                                                style={{
                                                                                    backgroundColor: isLargeFile ? "#2d1f00" : (isLoading ? "#1f2937" : "#161b22"),
                                                                                    border: isLargeFile ? "1px solid #e09e13" : (isLoading ? "1px solid #58a6ff" : "1px solid #30363d"),
                                                                                }}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (!isLargeFile) {
                                                                                        handleFileClick(file, commit);
                                                                                    }
                                                                                }}
                                                                                onMouseEnter={(e) => {
                                                                                    if (!isLoading && !isLargeFile) {
                                                                                        e.currentTarget.style.backgroundColor = "#1f2937";
                                                                                        e.currentTarget.style.borderColor = "#58a6ff";
                                                                                    }
                                                                                }}
                                                                                onMouseLeave={(e) => {
                                                                                    if (!isLoading && !isLargeFile) {
                                                                                        e.currentTarget.style.backgroundColor = "#161b22";
                                                                                        e.currentTarget.style.borderColor = "#30363d";
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                    {isLoading ? (
                                                                                        <div className="w-4 h-4 flex-shrink-0 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                                                                    ) : (
                                                                                        <svg
                                                                                            className="w-4 h-4 flex-shrink-0"
                                                                                            fill="none"
                                                                                            stroke={isLargeFile ? "#f0c541" : "#7d8590"}
                                                                                            viewBox="0 0 24 24"
                                                                                        >
                                                                                            <path
                                                                                                strokeLinecap="round"
                                                                                                strokeLinejoin="round"
                                                                                                strokeWidth={2}
                                                                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                                                            />
                                                                                        </svg>
                                                                                    )}
                                                                                    <span
                                                                                        className={`truncate ${!isLargeFile ? 'group-hover:underline' : ''}`}
                                                                                        style={{
                                                                                            color: isLargeFile ? "#f0c541" : "#58a6ff",
                                                                                            fontFamily: "var(--font-family-mono)",
                                                                                            fontSize: "0.875rem",
                                                                                        }}
                                                                                    >
                                                                                        {file.path}
                                                                                    </span>
                                                                                    {isLargeFile ? (
                                                                                        <span
                                                                                            className="text-xs px-1.5 py-0.5 rounded flex items-center gap-1"
                                                                                            style={{
                                                                                                backgroundColor: "#3d2c00",
                                                                                                color: "#f0c541",
                                                                                                border: "1px solid #e09e13",
                                                                                            }}
                                                                                        >
                                                                                            Large file ({totalChanges} lines)
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span
                                                                                            className="text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                                                                                            style={{
                                                                                                backgroundColor: "#238636",
                                                                                                color: "#ffffff",
                                                                                            }}
                                                                                        >
                                                                                            <ExternalLink className="w-3 h-3" />
                                                                                            {isLoading ? "Loading..." : "View Diff"}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                                                                                    <span
                                                                                        style={{
                                                                                            color: "#3fb950",
                                                                                            fontSize: "0.875rem",
                                                                                            fontFamily: "var(--font-family-mono)",
                                                                                        }}
                                                                                    >
                                                                                        +{file.added}
                                                                                    </span>
                                                                                    <span
                                                                                        style={{
                                                                                            color: "#f85149",
                                                                                            fontSize: "0.875rem",
                                                                                            fontFamily: "var(--font-family-mono)",
                                                                                        }}
                                                                                    >
                                                                                        -{file.removed}
                                                                                    </span>
                                                                                    {githubUrl && (
                                                                                        <a
                                                                                            href={githubUrl}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="p-1 rounded hover:bg-gray-700 transition-colors"
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                            title="View on GitHub"
                                                                                        >
                                                                                            <Github className="w-4 h-4" style={{ color: "#7d8590" }} />
                                                                                        </a>
                                                                                    )}
                                                                                </div>
                                                                            </motion.div>
                                                                        );
                                                                    })}
                                                                    {(commit.files?.length ?? 0) > MAX_FILES_TO_SHOW && (
                                                                        <div
                                                                            className="text-center py-2 text-sm"
                                                                            style={{ color: "#7d8590" }}
                                                                        >
                                                                            ... and {(commit.files?.length ?? 0) - MAX_FILES_TO_SHOW} more files
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Summary Stats */}
            <div className="mt-12 pt-8 grid grid-cols-3 gap-8" style={{ borderTop: "1px solid #30363d" }}>
                <div className="text-center">
                    <div className="text-3xl mb-1" style={{ color: "#3fb950" }}>
                        {filteredTotalAdded.toLocaleString()}
                    </div>
                    <div className="text-sm" style={{ color: "#7d8590" }}>
                        Total Lines Added
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-3xl mb-1" style={{ color: "#f85149" }}>
                        {filteredTotalRemoved.toLocaleString()}
                    </div>
                    <div className="text-sm" style={{ color: "#7d8590" }}>
                        Total Lines Removed
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-3xl mb-1" style={{ color: "#a371f7" }}>
                        {filteredContributors}
                    </div>
                    <div className="text-sm" style={{ color: "#7d8590" }}>
                        Contributors
                    </div>
                </div>
            </div>
        </div>
    );
}
