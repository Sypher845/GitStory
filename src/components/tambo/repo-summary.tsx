"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Star,
    GitFork,
    AlertCircle,
    Code,
    Calendar,
    Tag,
    ExternalLink,
    Folder,
    FileText,
    ChevronRight,
    ChevronDown,
    Scale,
    GitBranch,
} from "lucide-react";
import { z } from "zod";

// --- Schema ---

const FileStructureSchema = z.object({
    path: z.string().describe("File or folder path, e.g., 'src/components'"),
    type: z.enum(["file", "directory"]).describe("Whether this is a file or directory"),
    description: z.string().optional().describe("Brief description of what this file/folder does"),
});

// Type for recursive structure (used internally, schema is flat for AI simplicity)
type FileStructureInput = z.infer<typeof FileStructureSchema> & {
    children?: FileStructureInput[];
};

export const repoSummarySchema = z.object({
    name: z.string().describe("Repository name, e.g., 'react'"),
    fullName: z.string().describe("Full repository name in format 'owner/repo', e.g., 'facebook/react'"),
    description: z.string().optional().describe("Repository description"),
    language: z.string().optional().describe("Primary programming language"),
    stars: z.number().optional().describe("Number of stars"),
    forks: z.number().optional().describe("Number of forks"),
    openIssues: z.number().optional().describe("Number of open issues"),
    defaultBranch: z.string().optional().describe("Default branch name, e.g., 'main'"),
    topics: z.array(z.string()).optional().describe("Repository topics/tags"),
    license: z.string().optional().describe("License name, e.g., 'MIT'"),
    createdAt: z.string().optional().describe("Creation date in human-readable format"),
    updatedAt: z.string().optional().describe("Last update date in human-readable format"),
    structure: z.array(FileStructureSchema).optional().describe("Repository folder structure with descriptions"),
    repoUrl: z.string().optional().describe("GitHub repository URL"),
}).describe("Displays a comprehensive repository summary with the project name as the title and a brief description/summary about what the project does below the title. Includes stats, topics, and folder structure. Use when users ask about what a repository does, project structure, or want an overview.");

// --- Types ---

interface FileStructure {
    path: string;
    type: "file" | "directory";
    description?: string;
    children?: FileStructure[];
}

interface RepoSummaryProps {
    name?: string;
    fullName?: string;
    description?: string;
    language?: string;
    stars?: number;
    forks?: number;
    openIssues?: number;
    defaultBranch?: string;
    topics?: string[];
    license?: string;
    createdAt?: string;
    updatedAt?: string;
    structure?: FileStructure[];
    repoUrl?: string;
}

// --- Helper Components ---

const StatCard = ({
    label,
    value,
    icon: Icon,
    color,
}: {
    label: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
}) => (
    <div
        className="rounded-lg p-4"
        style={{ backgroundColor: "#0d1117", border: "1px solid #30363d" }}
    >
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "#161b22" }}>
                <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <span style={{ color: "#7d8590", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
            </span>
        </div>
        <div style={{ color: "#e6edf3", fontSize: "1.5rem", fontWeight: "600" }}>
            {typeof value === "number" ? value.toLocaleString() : value}
        </div>
    </div>
);

// Tree item component for folder structure
const TreeItem = ({
    item,
    depth = 0,
    isLast = false,
}: {
    item: FileStructure;
    depth?: number;
    isLast?: boolean;
}) => {
    const [isExpanded, setIsExpanded] = useState(depth < 2);
    const [showDescription, setShowDescription] = useState(false);
    const hasChildren = item.type === "directory" && item.children && item.children.length > 0;
    const fileName = item.path.split("/").pop() || item.path;

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (item.description) {
            setShowDescription(!showDescription);
        }
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
    };

    return (
        <div>
            <div
                className="flex items-start gap-2 py-1.5 px-2 rounded transition-colors cursor-pointer group"
                style={{ marginLeft: `${depth * 16}px` }}
                onClick={handleClick}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
                {/* Expand/collapse icon or spacer */}
                <div className="w-4 flex-shrink-0 flex items-center justify-center">
                    {hasChildren ? (
                        isExpanded ? (
                            <ChevronDown className="w-3 h-3" style={{ color: "#7d8590" }} />
                        ) : (
                            <ChevronRight className="w-3 h-3" style={{ color: "#7d8590" }} />
                        )
                    ) : null}
                </div>

                {/* Icon */}
                {item.type === "directory" ? (
                    <Folder className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#58a6ff" }} />
                ) : (
                    <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#7d8590" }} />
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                    <span
                        className="text-sm"
                        style={{
                            color: item.type === "directory" ? "#e6edf3" : "#adbac7",
                            fontFamily: "monospace",
                            fontWeight: item.type === "directory" ? "500" : "400",
                        }}
                    >
                        {fileName}
                        {item.type === "directory" && "/"}
                    </span>
                </div>
            </div>

            {/* Description Dropdown */}
            <AnimatePresence>
                {showDescription && item.description && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{ marginLeft: `${depth * 16 + 24}px` }}
                    >
                        <div
                            className="px-3 py-2 my-1 rounded-md text-xs"
                            style={{
                                backgroundColor: "rgba(56, 139, 253, 0.1)",
                                border: "1px solid rgba(56, 139, 253, 0.3)",
                                color: "#adbac7",
                            }}
                        >
                            {item.description}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Children */}
            <AnimatePresence>
                {hasChildren && isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        {item.children!.map((child, index) => (
                            <TreeItem
                                key={child.path}
                                item={child}
                                depth={depth + 1}
                                isLast={index === item.children!.length - 1}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- Main Component ---

export function RepoSummary({
    name,
    fullName,
    description,
    language,
    stars,
    forks,
    openIssues,
    defaultBranch,
    topics = [],
    license,
    createdAt,
    updatedAt,
    structure = [],
    repoUrl,
}: RepoSummaryProps) {
    // Construct GitHub URL
    const githubUrl = repoUrl || (fullName ? `https://github.com/${fullName}` : undefined);

    // Loading skeleton
    if (!name && !fullName) {
        return (
            <div className="rounded-xl p-8" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
                <div className="animate-pulse">
                    <div className="h-8 w-64 rounded mb-4" style={{ backgroundColor: "#21262d" }} />
                    <div className="h-4 w-full max-w-xl rounded mb-8" style={{ backgroundColor: "#21262d" }} />
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="h-24 rounded" style={{ backgroundColor: "#21262d" }} />
                        <div className="h-24 rounded" style={{ backgroundColor: "#21262d" }} />
                        <div className="h-24 rounded" style={{ backgroundColor: "#21262d" }} />
                    </div>
                    <div className="space-y-2">
                        <div className="h-6 w-32 rounded" style={{ backgroundColor: "#21262d" }} />
                        <div className="h-40 rounded" style={{ backgroundColor: "#21262d" }} />
                    </div>
                </div>
            </div>
        );
    }

    // Language color mapping
    const getLanguageColor = (lang?: string) => {
        const colors: Record<string, string> = {
            TypeScript: "#3178c6",
            JavaScript: "#f1e05a",
            Python: "#3572A5",
            Go: "#00ADD8",
            Rust: "#dea584",
            Java: "#b07219",
            "C++": "#f34b7d",
            C: "#555555",
            Ruby: "#701516",
            PHP: "#4F5D95",
            Swift: "#F05138",
            Kotlin: "#A97BFF",
        };
        return colors[lang || ""] || "#7d8590";
    };

    return (
        <div className="w-full rounded-xl p-6" style={{ backgroundColor: "#0d1117", border: "1px solid #30363d" }}>
            <div className="space-y-6">
                {/* Header */}
                <div
                    className="rounded-lg p-6"
                    style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}
                >
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                        <div>
                            <h1 className="text-2xl font-semibold mb-1" style={{ color: "#e6edf3" }}>
                                {name || fullName?.split("/")[1]}
                            </h1>
                            {fullName && (
                                <span className="text-sm" style={{ color: "#7d8590", fontFamily: "monospace" }}>
                                    {fullName}
                                </span>
                            )}
                        </div>
                        {githubUrl && (
                            <a
                                href={githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors"
                                style={{
                                    backgroundColor: "#21262d",
                                    color: "#e6edf3",
                                    border: "1px solid #30363d",
                                    textDecoration: "none",
                                }}
                            >
                                <ExternalLink className="w-4 h-4" />
                                View on GitHub
                            </a>
                        )}
                    </div>

                    {description && (
                        <p
                            className="text-base leading-relaxed mb-4"
                            style={{ color: "#adbac7" }}
                        >
                            {description}
                        </p>
                    )}

                    {/* Language and meta */}
                    <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: "#7d8590" }}>
                        {language && (
                            <div className="flex items-center gap-2">
                                <span
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: getLanguageColor(language) }}
                                />
                                <span style={{ color: "#e6edf3" }}>{language}</span>
                            </div>
                        )}
                        {defaultBranch && (
                            <div className="flex items-center gap-1.5">
                                <GitBranch className="w-4 h-4" />
                                <span>{defaultBranch}</span>
                            </div>
                        )}
                        {license && (
                            <div className="flex items-center gap-1.5">
                                <Scale className="w-4 h-4" />
                                <span>{license}</span>
                            </div>
                        )}
                        {updatedAt && (
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>Updated {updatedAt}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats */}
                {(stars !== undefined || forks !== undefined || openIssues !== undefined) && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {stars !== undefined && (
                            <StatCard label="Stars" value={stars} icon={Star} color="#f0c541" />
                        )}
                        {forks !== undefined && (
                            <StatCard label="Forks" value={forks} icon={GitFork} color="#58a6ff" />
                        )}
                        {openIssues !== undefined && (
                            <StatCard label="Open Issues" value={openIssues} icon={AlertCircle} color="#3fb950" />
                        )}
                    </div>
                )}

                {/* Topics */}
                {topics.length > 0 && (
                    <div
                        className="rounded-lg p-5"
                        style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}
                    >
                        <h3
                            className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-2"
                            style={{ color: "#7d8590" }}
                        >
                            <Tag className="w-4 h-4" />
                            Topics
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {topics.map((topic) => (
                                <span
                                    key={topic}
                                    className="px-3 py-1 rounded-full text-xs font-medium"
                                    style={{
                                        backgroundColor: "rgba(56, 139, 253, 0.15)",
                                        color: "#58a6ff",
                                        border: "1px solid rgba(56, 139, 253, 0.4)",
                                    }}
                                >
                                    {topic}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Folder Structure */}
                {structure.length > 0 && (
                    <div
                        className="rounded-lg overflow-hidden"
                        style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}
                    >
                        <div
                            className="px-6 py-4 flex items-center gap-2"
                            style={{ backgroundColor: "rgba(255,255,255,0.02)", borderBottom: "1px solid #21262d" }}
                        >
                            <Code className="w-4 h-4" style={{ color: "#7d8590" }} />
                            <h3 className="font-semibold text-sm" style={{ color: "#e6edf3" }}>
                                Project Structure
                            </h3>
                        </div>
                        <div
                            className="p-4 overflow-y-auto"
                            style={{ maxHeight: "400px", scrollbarWidth: "thin", scrollbarColor: "#30363d #161b22" }}
                        >
                            {structure.map((item, index) => (
                                <TreeItem key={item.path} item={item} isLast={index === structure.length - 1} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Created date footer */}
                {createdAt && (
                    <div className="text-center pt-4" style={{ borderTop: "1px solid #21262d" }}>
                        <span className="text-xs" style={{ color: "#7d8590" }}>
                            Repository created {createdAt}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
