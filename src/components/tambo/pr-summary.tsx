"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Copy, ExternalLink, Check, AlertTriangle, GitMerge, Timer, FileText, Info, User } from "lucide-react";
import { z } from "zod";

// --- Schemas ---

const ReviewerSchema = z.object({
    id: z.string().describe("Unique identifier for the reviewer"),
    name: z.string().describe("Display name of the reviewer"),
    avatar: z.string().optional().describe("URL to the reviewer's avatar image"),
    status: z.enum(["approved", "pending", "rejected", "commented"]).describe("Review status: approved, pending, rejected, or commented"),
});

const FileStatSchema = z.object({
    path: z.string().describe("File path that was changed, e.g., 'src/hooks/useData.ts'"),
    additions: z.number().describe("Number of lines added"),
    deletions: z.number().describe("Number of lines removed"),
});

const LabelSchema = z.object({
    id: z.string().describe("Unique identifier for the label"),
    name: z.string().describe("Label name, e.g., 'Refactoring', 'API', 'High Priority'"),
    color: z.string().optional().describe("Background color class or hex value"),
});

const IssueSchema = z.object({
    id: z.string().describe("Issue identifier/number"),
    title: z.string().describe("Issue title"),
});

export const prSummarySchema = z.object({
    id: z.number().describe("Pull request number"),
    title: z.string().describe("Pull request title"),
    repo: z.string().describe("Repository in format 'owner/repo' - REQUIRED for View in GitHub link to work, e.g., 'facebook/react'"),
    status: z.enum(["Open", "Merged", "Closed", "Draft"]).describe("PR status: Open, Merged, Closed, or Draft"),
    author: z.object({
        name: z.string().describe("Author's username/display name"),
        avatar: z.string().optional().describe("URL to author's avatar"),
    }).describe("PR author information"),
    baseBranch: z.string().describe("Target branch, e.g., 'main'"),
    headBranch: z.string().describe("Source branch, e.g., 'feat/data-layer'"),
    createdAt: z.string().describe("Human-readable creation time, e.g., '2 hours ago'"),
    stats: z.object({
        filesChanged: z.number().describe("Number of files changed"),
        additions: z.number().describe("Total lines added"),
        deletions: z.number().describe("Total lines removed"),
        estimate: z.string().optional().describe("Estimated review time, e.g., '25m'"),
        risk: z.enum(["Low", "Medium", "High"]).optional().describe("Risk assessment level"),
    }).describe("PR statistics"),
    description: z.object({
        why: z.string().describe("Explanation of why the change was made"),
        improvements: z.array(z.string()).optional().describe("List of improvements made"),
    }).optional().describe("PR description with context"),
    breakingChanges: z.string().optional().describe("Description of any breaking changes"),
    contributors: z.array(z.object({
        username: z.string().describe("GitHub username of the contributor"),
        avatar: z.string().optional().describe("URL to contributor's avatar image"),
    })).optional().describe("List of contributors with their GitHub usernames and avatars"),
    files: z.array(FileStatSchema).optional().describe("List of changed files with stats"),
    reviewers: z.array(ReviewerSchema).optional().describe("List of reviewers and their status"),
    labels: z.array(LabelSchema).optional().describe("List of labels applied to the PR"),
    issues: z.array(IssueSchema).optional().describe("List of linked issues"),
    checks: z.object({
        passed: z.boolean().describe("Whether all checks passed"),
        total: z.number().describe("Total number of checks"),
        items: z.array(z.string()).optional().describe("List of check names"),
    }).optional().describe("CI/CD check status"),
    prUrl: z.string().optional().describe("URL to view the PR on GitHub"),
}).describe("Displays a comprehensive pull request summary with stats, reviewers, files changed, and metadata. Use when showing PR details, code review information, or merge request summaries.");

// --- Types ---

interface Reviewer {
    id: string;
    name: string;
    avatar?: string;
    status: "approved" | "pending" | "rejected" | "commented";
}

interface FileStat {
    path: string;
    additions: number;
    deletions: number;
}

interface Label {
    id: string;
    name: string;
    color?: string;
}

interface Issue {
    id: string;
    title: string;
}

interface PRSummaryProps {
    id?: number;
    title?: string;
    repo?: string;
    status?: "Open" | "Merged" | "Closed" | "Draft";
    author?: {
        name: string;
        avatar?: string;
    };
    baseBranch?: string;
    headBranch?: string;
    createdAt?: string;
    stats?: {
        filesChanged: number;
        additions: number;
        deletions: number;
        estimate?: string;
        risk?: "Low" | "Medium" | "High";
    };
    description?: {
        why: string;
        improvements?: string[];
    };
    breakingChanges?: string;
    contributors?: Array<{ username: string; avatar?: string }>;
    files?: FileStat[];
    reviewers?: Reviewer[];
    labels?: Label[];
    issues?: Issue[];
    checks?: {
        passed: boolean;
        total: number;
        items?: string[];
    };
    prUrl?: string;
}

// --- Helper Components ---

const StatCard = ({ label, value, icon: Icon, colorClass, subContent }: {
    label: string;
    value: string | number;
    icon?: React.ElementType;
    colorClass: string;
    subContent?: React.ReactNode;
}) => (
    <div className="flex flex-col border-r pr-4 last:border-0" style={{ borderColor: "#21262d" }}>
        <span className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: "#7d8590" }}>{label}</span>
        {subContent ? (
            subContent
        ) : (
            <div className="flex items-center gap-2">
                {Icon && <Icon className="w-4 h-4" style={{ color: colorClass === "text-gray-500" ? "#7d8590" : colorClass }} />}
                <span className="text-lg font-medium" style={{ color: label === "Risk Score" ? colorClass : "#e6edf3" }}>{value}</span>
            </div>
        )}
    </div>
);

const FileRow = ({ file, maxChanges }: { file: FileStat; maxChanges: number }) => {
    const total = file.additions + file.deletions;

    return (
        <div
            className="px-6 py-3 flex items-center justify-between transition-colors group cursor-pointer"
            style={{ backgroundColor: "transparent" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
            <div className="flex items-center gap-3">
                <FileText className="w-4 h-4" style={{ color: "#58a6ff" }} />
                <span className="text-sm" style={{ color: "#7d8590", fontFamily: "monospace" }}>{file.path}</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="w-24 h-1 flex rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                    <div style={{ width: `${(file.additions / total) * 100}%`, backgroundColor: "#3fb950" }} />
                    <div style={{ width: `${(file.deletions / total) * 100}%`, backgroundColor: "#f85149" }} />
                </div>
                <div className="flex gap-2 min-w-[60px] justify-end" style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>
                    {file.additions > 0 && <span style={{ color: "#3fb950" }}>+{file.additions}</span>}
                    {file.deletions > 0 && <span style={{ color: "#f85149" }}>-{file.deletions}</span>}
                </div>
            </div>
        </div>
    );
};

const ReviewerRow = ({ reviewer }: { reviewer: Reviewer }) => (
    <div
        className="flex items-center justify-between group cursor-pointer -mx-2 px-2 py-1 rounded transition-colors"
        style={{ backgroundColor: "transparent" }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)")}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
        <div className="flex items-center gap-2">
            {reviewer.avatar ? (
                <img
                    className="w-5 h-5 rounded-full"
                    src={reviewer.avatar}
                    alt={reviewer.name}
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                />
            ) : (
                <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#21262d" }}>
                    <User className="w-3 h-3" style={{ color: "#7d8590" }} />
                </div>
            )}
            <span className="text-sm" style={{ color: "#e6edf3" }}>{reviewer.name}</span>
        </div>
        {reviewer.status === "approved" ? (
            <Check className="w-4 h-4" style={{ color: "#3fb950" }} />
        ) : reviewer.status === "rejected" ? (
            <AlertTriangle className="w-4 h-4" style={{ color: "#f85149" }} />
        ) : (
            <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: "#30363d" }} />
        )}
    </div>
);

// --- Main Component ---

export function PRSummary({
    id,
    title,
    repo,
    status = "Open",
    author,
    baseBranch,
    headBranch,
    createdAt,
    stats,
    description,
    breakingChanges,
    contributors = [],
    files = [],
    reviewers = [],
    labels = [],
    issues = [],
    checks,
    prUrl,
}: PRSummaryProps) {
    const [copied, setCopied] = useState(false);
    const [expandedFiles, setExpandedFiles] = useState(false);

    // Construct GitHub URL from repo and id if prUrl not provided
    const githubUrl = prUrl || (repo && id ? `https://github.com/${repo}/pull/${id}` : undefined);

    // Handle undefined data during streaming
    if (!title && !id) {
        return (
            <div className="rounded-xl p-8" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
                <div className="animate-pulse">
                    <div className="h-8 w-64 rounded mb-4" style={{ backgroundColor: "#21262d" }} />
                    <div className="h-4 w-96 rounded mb-8" style={{ backgroundColor: "#21262d" }} />
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        <div className="h-16 rounded" style={{ backgroundColor: "#21262d" }} />
                        <div className="h-16 rounded" style={{ backgroundColor: "#21262d" }} />
                        <div className="h-16 rounded" style={{ backgroundColor: "#21262d" }} />
                        <div className="h-16 rounded" style={{ backgroundColor: "#21262d" }} />
                    </div>
                    <div className="space-y-4">
                        <div className="h-24 rounded" style={{ backgroundColor: "#21262d" }} />
                        <div className="h-24 rounded" style={{ backgroundColor: "#21262d" }} />
                    </div>
                </div>
            </div>
        );
    }

    const safeFiles = files ?? [];
    const maxFileChanges = safeFiles.length > 0 ? Math.max(...safeFiles.map(f => f.additions + f.deletions)) : 1;

    const copyBranchName = () => {
        if (headBranch) {
            navigator.clipboard.writeText(headBranch);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case "Merged":
                return { bg: "rgba(138, 95, 255, 0.2)", text: "#a371f7", border: "rgba(138, 95, 255, 0.5)" };
            case "Open":
                return { bg: "rgba(63, 185, 80, 0.2)", text: "#3fb950", border: "rgba(63, 185, 80, 0.5)" };
            case "Closed":
                return { bg: "rgba(248, 81, 73, 0.2)", text: "#f85149", border: "rgba(248, 81, 73, 0.5)" };
            case "Draft":
                return { bg: "rgba(125, 133, 144, 0.2)", text: "#7d8590", border: "rgba(125, 133, 144, 0.5)" };
            default:
                return { bg: "rgba(125, 133, 144, 0.2)", text: "#7d8590", border: "rgba(125, 133, 144, 0.5)" };
        }
    };

    const getRiskColor = (risk?: string) => {
        switch (risk) {
            case "High":
                return "#f85149";
            case "Medium":
                return "#f0c541";
            case "Low":
                return "#3fb950";
            default:
                return "#7d8590";
        }
    };

    const getLabelColors = (label: Label) => {
        // Default colors based on common label patterns
        const lowerName = label.name.toLowerCase();
        if (lowerName.includes("priority") || lowerName.includes("urgent")) {
            return { bg: "rgba(138, 95, 255, 0.2)", text: "#a371f7", border: "rgba(138, 95, 255, 0.4)" };
        }
        if (lowerName.includes("api") || lowerName.includes("breaking")) {
            return { bg: "rgba(255, 255, 255, 0.05)", text: "#7d8590", border: "rgba(255, 255, 255, 0.1)" };
        }
        if (lowerName.includes("refactor")) {
            return { bg: "rgba(88, 166, 255, 0.2)", text: "#58a6ff", border: "rgba(88, 166, 255, 0.4)" };
        }
        return { bg: "rgba(255, 255, 255, 0.05)", text: "#e6edf3", border: "rgba(255, 255, 255, 0.1)" };
    };

    const statusColor = getStatusColor();
    const displayFiles = expandedFiles ? safeFiles : safeFiles.slice(0, 4);

    return (
        <div className="w-full rounded-xl p-6" style={{ backgroundColor: "#0d1117", border: "1px solid #30363d" }}>
            <div className="space-y-6">
                {/* Header Card */}
                <div className="rounded-lg p-6" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "#e6edf3" }}>
                            {title} <span style={{ color: "#7d8590", fontWeight: "normal" }} className="ml-2">#{id}</span>
                        </h1>
                        <span
                            className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                            style={{ backgroundColor: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}
                        >
                            <GitMerge className="w-3 h-3" /> {status}
                        </span>
                    </div>

                    {/* Author Meta */}
                    {author && (
                        <div className="flex items-center gap-3 text-sm mb-6 pb-6 flex-wrap" style={{ color: "#7d8590", borderBottom: "1px solid #21262d" }}>
                            {author.avatar && (
                                <img
                                    alt={author.name}
                                    className="w-6 h-6 rounded-full"
                                    src={author.avatar}
                                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                                />
                            )}
                            <span className="font-medium" style={{ color: "#e6edf3" }}>{author.name}</span>
                            {baseBranch && headBranch && (
                                <span style={{ color: "#7d8590" }}>
                                    wants to merge into{" "}
                                    <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#e6edf3", fontFamily: "monospace" }}>
                                        {baseBranch}
                                    </span>{" "}
                                    from{" "}
                                    <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#e6edf3", fontFamily: "monospace" }}>
                                        {headBranch}
                                    </span>
                                </span>
                            )}
                            {createdAt && (
                                <>
                                    <span style={{ color: "#30363d" }}>•</span>
                                    <span style={{ color: "#7d8590" }}>{createdAt}</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Stats Grid */}
                    {stats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard
                                label="Files Changed"
                                value={stats.filesChanged}
                                icon={FileText}
                                colorClass="text-gray-500"
                            />
                            <StatCard
                                label="Changes"
                                value=""
                                colorClass=""
                                subContent={
                                    <>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm" style={{ color: "#3fb950", fontFamily: "monospace" }}>+{stats.additions}</span>
                                            <span className="text-sm" style={{ color: "#f85149", fontFamily: "monospace" }}>-{stats.deletions}</span>
                                        </div>
                                        <div className="w-full h-1 rounded-full overflow-hidden flex" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                                            <div style={{ width: `${(stats.additions / (stats.additions + stats.deletions)) * 100}%`, backgroundColor: "#3fb950" }} />
                                            <div style={{ width: `${(stats.deletions / (stats.additions + stats.deletions)) * 100}%`, backgroundColor: "#f85149" }} />
                                        </div>
                                    </>
                                }
                            />
                            {stats.estimate && (
                                <StatCard
                                    label="Review Estimate"
                                    value={stats.estimate}
                                    icon={Timer}
                                    colorClass="#58a6ff"
                                />
                            )}
                            {stats.risk && (
                                <StatCard
                                    label="Risk Score"
                                    value={stats.risk}
                                    icon={AlertTriangle}
                                    colorClass={getRiskColor(stats.risk)}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Description, Breaking Changes & Contributors */}
                {(description || breakingChanges || (contributors?.length ?? 0) > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* The Why */}
                        {description && (
                            <div
                                className="rounded-lg p-6 flex flex-col"
                                style={{
                                    backgroundColor: "#161b22",
                                    border: "1px solid #30363d",
                                    height: "340px",
                                }}
                            >
                                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 uppercase tracking-wide flex-shrink-0" style={{ color: "#e6edf3" }}>
                                    <Info className="w-4 h-4" style={{ color: "#7d8590" }} />
                                    The Why
                                </h3>
                                <div
                                    className="text-sm leading-relaxed flex-1 overflow-y-auto pr-2"
                                    style={{ color: "#7d8590", scrollbarWidth: "thin", scrollbarColor: "#30363d #161b22" }}
                                >
                                    <p>{description.why}</p>
                                    {description.improvements && description.improvements.length > 0 && (
                                        <>
                                            <p className="mt-3">This change improves:</p>
                                            <ul className="list-disc pl-4 mt-2 space-y-1">
                                                {description.improvements.map((imp, i) => (
                                                    <li key={i}>{imp}</li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-6">
                            {/* Breaking Changes */}
                            {breakingChanges ? (
                                <div
                                    className="rounded-lg p-5 flex flex-col"
                                    style={{
                                        backgroundColor: "rgba(240, 197, 65, 0.1)",
                                        border: "1px solid rgba(240, 197, 65, 0.3)",
                                        height: "140px",
                                    }}
                                >
                                    <h3 className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-2 flex-shrink-0" style={{ color: "#f0c541" }}>
                                        <AlertTriangle className="w-4 h-4" />
                                        Breaking Changes
                                    </h3>
                                    <p
                                        className="text-sm leading-relaxed flex-1 overflow-y-auto pr-2"
                                        style={{ color: "#e6edf3", scrollbarWidth: "thin", scrollbarColor: "#30363d transparent" }}
                                    >
                                        {breakingChanges}
                                    </p>
                                </div>
                            ) : (
                                <div
                                    className="rounded-lg p-5"
                                    style={{
                                        backgroundColor: "rgba(63, 185, 80, 0.1)",
                                        border: "1px solid rgba(63, 185, 80, 0.3)",
                                        height: "140px",
                                    }}
                                >
                                    <h3 className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-2" style={{ color: "#3fb950" }}>
                                        <Check className="w-4 h-4" />
                                        Breaking Changes
                                    </h3>
                                    <p className="text-sm leading-relaxed" style={{ color: "#7d8590" }}>
                                        No breaking changes introduced
                                    </p>
                                </div>
                            )}

                            {/* Contributors */}
                            {(contributors?.length ?? 0) > 0 && (
                                <div
                                    className="rounded-lg p-6 flex flex-col flex-1"
                                    style={{
                                        backgroundColor: "#161b22",
                                        border: "1px solid #30363d",
                                        height: "180px",
                                    }}
                                >
                                    <h3 className="text-xs font-bold uppercase tracking-wide mb-4 flex-shrink-0" style={{ color: "#7d8590" }}>Key Contributors</h3>
                                    <div className="flex-1 overflow-y-auto pr-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#30363d #161b22" }}>
                                        <div className="flex flex-col space-y-3">
                                            {contributors?.map((contributor, idx) => {
                                                // Handle both string and object formats for backward compatibility
                                                const username = typeof contributor === 'string' ? contributor : contributor?.username;
                                                const avatar = typeof contributor === 'string' ? undefined : contributor?.avatar;

                                                if (!username) return null;

                                                return (
                                                    <a
                                                        key={username || idx}
                                                        href={`https://github.com/${username}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-3 group transition-colors rounded-md p-1 -m-1"
                                                        style={{ backgroundColor: "transparent" }}
                                                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)")}
                                                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                                    >
                                                        {avatar ? (
                                                            <img
                                                                src={avatar}
                                                                alt={username}
                                                                className="w-6 h-6 rounded-full"
                                                                style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                                                            />
                                                        ) : (
                                                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#21262d" }}>
                                                                <User className="w-3 h-3" style={{ color: "#7d8590" }} />
                                                            </div>
                                                        )}
                                                        <span className="text-sm" style={{ color: "#e6edf3", fontFamily: "monospace" }}>@{username}</span>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* File Breakdown */}
                {(files?.length ?? 0) > 0 && (
                    <div className="rounded-lg overflow-hidden" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
                        <div className="px-6 py-4 flex justify-between items-center" style={{ backgroundColor: "rgba(255,255,255,0.02)", borderBottom: "1px solid #21262d" }}>
                            <h3 className="font-semibold text-sm" style={{ color: "#e6edf3" }}>File Breakdown</h3>
                            <span className="text-xs" style={{ color: "#7d8590" }}>Top {Math.min(files.length, 4)} by complexity</span>
                        </div>
                        <div style={{ borderTop: "1px solid #21262d" }}>
                            {displayFiles.map((file, i) => (
                                <div key={i} style={{ borderBottom: i < displayFiles.length - 1 ? "1px solid #21262d" : "none" }}>
                                    <FileRow file={file} maxChanges={maxFileChanges} />
                                </div>
                            ))}
                        </div>
                        {files.length > 4 && (
                            <div className="px-6 py-3 text-center" style={{ backgroundColor: "rgba(255,255,255,0.02)", borderTop: "1px solid #21262d" }}>
                                <button
                                    onClick={() => setExpandedFiles(!expandedFiles)}
                                    className="text-xs font-medium uppercase tracking-wide transition-colors"
                                    style={{ color: "#58a6ff" }}
                                >
                                    {expandedFiles ? "Show less" : `View all ${files.length} files`}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Checks Status */}
                {checks ? (
                    <div
                        className="rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4"
                        style={{
                            backgroundColor: checks.passed ? "rgba(63, 185, 80, 0.1)" : "rgba(248, 81, 73, 0.1)",
                            border: `1px solid ${checks.passed ? "rgba(63, 185, 80, 0.3)" : "rgba(248, 81, 73, 0.3)"}`,
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="rounded-full p-1"
                                style={{ backgroundColor: checks.passed ? "#3fb950" : "#f85149" }}
                            >
                                <Check className="w-4 h-4" style={{ color: "#ffffff" }} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm" style={{ color: checks.passed ? "#3fb950" : "#f85149" }}>
                                    {checks.passed ? "All checks passed" : "Some checks failed"}
                                </h4>
                                <p className="text-xs" style={{ color: checks.passed ? "rgba(63, 185, 80, 0.8)" : "rgba(248, 81, 73, 0.8)" }}>
                                    {checks.total} {checks.passed ? "successful" : "total"} checks
                                </p>
                            </div>
                        </div>
                        {checks.items && checks.items.length > 0 && (
                            <div className="flex items-center gap-4 text-xs font-medium" style={{ color: "#7d8590" }}>
                                {checks.items.map((check, i) => (
                                    <span key={i} className="flex items-center gap-1.5">
                                        <span
                                            className="w-1.5 h-1.5 rounded-full"
                                            style={{
                                                backgroundColor: checks.passed ? "#3fb950" : "#f85149",
                                                boxShadow: checks.passed ? "0 0 8px rgba(56,161,105,0.4)" : "0 0 8px rgba(248,81,73,0.4)",
                                            }}
                                        />
                                        {check}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div
                        className="rounded-lg p-4 flex items-center gap-3"
                        style={{
                            backgroundColor: "rgba(125, 133, 144, 0.1)",
                            border: "1px solid rgba(125, 133, 144, 0.3)",
                        }}
                    >
                        <div className="rounded-full p-1" style={{ backgroundColor: "#30363d" }}>
                            <Info className="w-4 h-4" style={{ color: "#7d8590" }} />
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm" style={{ color: "#7d8590" }}>No CI/CD Pipelines</h4>
                            <p className="text-xs" style={{ color: "rgba(125, 133, 144, 0.8)" }}>No pipelines configured for this pull request</p>
                        </div>
                    </div>
                )}

                {/* Sidebar Info - Horizontal Layout */}
                {((reviewers?.length ?? 0) > 0 || (labels?.length ?? 0) > 0 || (issues?.length ?? 0) > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Reviewers */}
                        {(reviewers?.length ?? 0) > 0 && (
                            <div className="rounded-lg p-5" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
                                <h4 className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: "#7d8590" }}>Reviewers</h4>
                                <div className="space-y-2">
                                    {reviewers.map((reviewer) => (
                                        <ReviewerRow key={reviewer.id} reviewer={reviewer} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Labels */}
                        {(labels?.length ?? 0) > 0 && (
                            <div className="rounded-lg p-5" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
                                <h4 className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: "#7d8590" }}>Labels</h4>
                                <div className="flex flex-wrap gap-2">
                                    {labels.map((label) => {
                                        const colors = getLabelColors(label);
                                        return (
                                            <span
                                                key={label.id}
                                                className="px-2 py-0.5 rounded text-[11px] font-medium"
                                                style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
                                            >
                                                {label.name}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Linked Issues */}
                        {(issues?.length ?? 0) > 0 && (
                            <div className="rounded-lg p-5" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
                                <h4 className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: "#7d8590" }}>Linked Issues</h4>
                                <div className="space-y-2">
                                    {issues.map((issue) => (
                                        <a key={issue.id} className="block text-sm truncate transition-colors cursor-pointer" style={{ color: "#e6edf3" }}>
                                            <span className="text-xs mr-1" style={{ color: "#7d8590", fontFamily: "monospace" }}>#{issue.id}</span> {issue.title}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                {headBranch && (
                    <div className="rounded-lg p-5" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
                        <h4 className="text-[10px] uppercase tracking-wider font-semibold mb-3" style={{ color: "#7d8590" }}>Actions</h4>
                        <div className="flex gap-3">
                            <button
                                onClick={copyBranchName}
                                className="flex-1 py-1.5 px-4 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#e6edf3", border: "1px solid #30363d" }}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                {copied ? "Copied!" : "Copy Branch Name"}
                            </button>
                            {githubUrl ? (
                                <a
                                    href={githubUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 py-1.5 px-4 rounded text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                    style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "#e6edf3", border: "1px solid #30363d", textDecoration: "none" }}
                                >
                                    <ExternalLink className="w-4 h-4" /> View in GitHub
                                </a>
                            ) : (
                                <span
                                    className="flex-1 py-1.5 px-4 rounded text-xs font-medium flex items-center justify-center gap-2"
                                    style={{ backgroundColor: "rgba(255,255,255,0.02)", color: "#7d8590", border: "1px solid #21262d" }}
                                >
                                    <ExternalLink className="w-4 h-4" /> View in GitHub
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
