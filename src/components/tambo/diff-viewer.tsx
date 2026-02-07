"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Info, AlertTriangle, XCircle, Lightbulb } from "lucide-react";
import { z } from "zod";

// Schema for Tambo registration
const AnnotationSchema = z.object({
    line: z.number().describe("Line number where the annotation appears"),
    message: z.string().describe("The annotation message explaining the code change"),
    type: z.enum(["info", "warning", "error", "insight"]).describe("Type of annotation: info, warning, error, or insight"),
});

export const diffViewerSchema = z.object({
    fileName: z.string().describe("Name of the file being diffed, e.g., 'src/utils/auth.ts'"),
    beforeCode: z.string().describe("The original code before changes"),
    afterCode: z.string().describe("The modified code after changes"),
    language: z.string().describe("Programming language for syntax highlighting, e.g., 'javascript', 'typescript', 'python'"),
    annotations: z.array(AnnotationSchema).optional().describe("Optional array of annotations for specific lines"),
    commitHash: z.string().optional().describe("Optional short commit hash for reference"),
}).describe("Displays a side-by-side or unified diff view of code changes with syntax highlighting and optional annotations. Use when showing file changes, code differences, or commit diffs.");

interface Annotation {
    line: number;
    message: string;
    type: "info" | "warning" | "error" | "insight";
}

interface DiffViewerProps {
    fileName?: string;
    beforeCode?: string;
    afterCode?: string;
    language?: string;
    annotations?: Annotation[];
    commitHash?: string;
}

interface DiffLine {
    type: "unchanged" | "removed" | "added";
    lineNumber: number;
    content: string;
}

// Simple diff function - computes line-by-line diff
function computeDiff(beforeCode: string, afterCode: string): DiffLine[] {
    const beforeLines = (beforeCode || "").split("\n");
    const afterLines = (afterCode || "").split("\n");

    // Limit to prevent hangs
    const MAX_LINES = 500;
    const before = beforeLines.slice(0, MAX_LINES);
    const after = afterLines.slice(0, MAX_LINES);

    const result: DiffLine[] = [];
    const maxLen = Math.max(before.length, after.length);

    for (let i = 0; i < maxLen; i++) {
        const beforeLine = before[i];
        const afterLine = after[i];

        if (beforeLine === undefined && afterLine !== undefined) {
            result.push({ type: "added", lineNumber: i + 1, content: afterLine });
        } else if (beforeLine !== undefined && afterLine === undefined) {
            result.push({ type: "removed", lineNumber: i + 1, content: beforeLine });
        } else if (beforeLine === afterLine) {
            result.push({ type: "unchanged", lineNumber: i + 1, content: afterLine || "" });
        } else {
            result.push({ type: "removed", lineNumber: i + 1, content: beforeLine || "" });
            result.push({ type: "added", lineNumber: i + 1, content: afterLine || "" });
        }
    }

    return result;
}

export function DiffViewer({
    fileName: rawFileName,
    beforeCode: rawBeforeCode,
    afterCode: rawAfterCode,
    language: rawLanguage,
    annotations: rawAnnotations,
    commitHash,
}: DiffViewerProps) {
    // Null-safe prop defaults (handles both undefined AND null)
    const fileName = rawFileName ?? "";
    const beforeCode = rawBeforeCode ?? "";
    const afterCode = rawAfterCode ?? "";
    const language = rawLanguage ?? "javascript";
    const safeAnnotations = rawAnnotations ?? [];

    const [viewMode, setViewMode] = useState<"split" | "unified">("split");
    const [showAnnotations, setShowAnnotations] = useState(true);

    // Memoize the diff computation
    const diffLines = useMemo(() => {
        return computeDiff(beforeCode, afterCode);
    }, [beforeCode, afterCode]);

    // Get line counts for display - MUST be before any early returns
    const beforeLines = useMemo(() => (beforeCode || "").split("\n"), [beforeCode]);
    const afterLines = useMemo(() => (afterCode || "").split("\n"), [afterCode]);

    // Precompute sets for O(1) lookup in split view - MUST be before any early returns
    const beforeLinesSet = useMemo(() => new Set(beforeLines), [beforeLines]);
    const afterLinesSet = useMemo(() => new Set(afterLines), [afterLines]);

    // Handle undefined data during streaming (loading state)
    if (!fileName && !beforeCode && !afterCode) {
        return (
            <div className="rounded-xl p-8" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
                <div className="animate-pulse">
                    <div className="h-8 w-48 bg-gray-700 rounded mb-4" />
                    <div className="h-4 w-64 bg-gray-700 rounded mb-8" />
                    <div className="h-64 bg-gray-700 rounded" />
                </div>
            </div>
        );
    }

    // Handle case where file name is provided but content couldn't be fetched
    if (fileName && !beforeCode && !afterCode) {
        return (
            <div className="rounded-xl p-6" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#e09e13" }} />
                    <h2 style={{ color: "#e6edf3", fontSize: "1.25rem", fontWeight: "600" }}>
                        {fileName}
                    </h2>
                    {commitHash && (
                        <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: "#21262d", color: "#7d8590" }}>
                            {commitHash}
                        </span>
                    )}
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: "#2d1f00", border: "1px solid #e09e13" }}>
                    <p style={{ color: "#f0c541" }}>
                        ⚠️ File content could not be retrieved. This may happen if:
                    </p>
                    <ul className="mt-2 ml-4 list-disc" style={{ color: "#c9d1d9" }}>
                        <li>The file was renamed or moved in this commit</li>
                        <li>The file is binary or too large</li>
                        <li>API rate limits were reached</li>
                    </ul>
                    <p className="mt-3" style={{ color: "#7d8590" }}>
                        Try viewing this file directly on GitHub.
                    </p>
                </div>
            </div>
        );
    }

    const getAnnotationForLine = (lineNumber: number) => {
        return safeAnnotations.find((a) => a.line === lineNumber);
    };

    const getAnnotationStyle = (type: Annotation["type"]) => {
        switch (type) {
            case "error":
                return { bg: "#3d1319", border: "#da3633", text: "#f85149" };
            case "warning":
                return { bg: "#3d2c00", border: "#e09e13", text: "#f0c541" };
            case "info":
                return { bg: "#0c2d6b", border: "#58a6ff", text: "#58a6ff" };
            case "insight":
                return { bg: "#271c3a", border: "#a371f7", text: "#d2a8ff" };
            default:
                return { bg: "#1f2937", border: "#374151", text: "#9ca3af" };
        }
    };

    const getAnnotationIcon = (type: Annotation["type"]) => {
        switch (type) {
            case "error":
                return <XCircle className="w-4 h-4" />;
            case "warning":
                return <AlertTriangle className="w-4 h-4" />;
            case "info":
                return <Info className="w-4 h-4" />;
            case "insight":
                return <Lightbulb className="w-4 h-4" />;
        }
    };

    // safeAnnotations is already defined at the top with null coalescing

    // Calculate dynamic height based on max lines (24px per line, capped at 720px for ~30 lines)
    const lineHeight = 24;
    const maxLines = Math.min(Math.max(beforeLines.length, afterLines.length), 500);
    const panelHeight = Math.min(maxLines * lineHeight, 720);

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="rounded-lg p-6" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#3fb950" }} />
                            <h2 style={{ color: "#e6edf3", fontSize: "1.5rem", fontWeight: "600" }}>
                                Code Changes
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <p style={{ color: "#7d8590", fontSize: "0.875rem", fontFamily: "monospace" }}>
                                {fileName}
                                {commitHash && (
                                    <span
                                        className="ml-2 px-2 py-0.5 rounded"
                                        style={{ backgroundColor: "#30363d", color: "#7d8590" }}
                                    >
                                        {commitHash}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #30363d" }}>
                            <button
                                onClick={() => setViewMode("split")}
                                className="px-4 py-2 text-sm transition-colors"
                                style={{
                                    backgroundColor: viewMode === "split" ? "#238636" : "#21262d",
                                    color: viewMode === "split" ? "#ffffff" : "#7d8590",
                                }}
                            >
                                Split
                            </button>
                            <button
                                onClick={() => setViewMode("unified")}
                                className="px-4 py-2 text-sm transition-colors"
                                style={{
                                    backgroundColor: viewMode === "unified" ? "#238636" : "#21262d",
                                    color: viewMode === "unified" ? "#ffffff" : "#7d8590",
                                }}
                            >
                                Unified
                            </button>
                        </div>
                        {safeAnnotations.length > 0 && (
                            <button
                                onClick={() => setShowAnnotations(!showAnnotations)}
                                className="px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                                style={{
                                    backgroundColor: showAnnotations ? "#238636" : "#21262d",
                                    color: showAnnotations ? "#ffffff" : "#7d8590",
                                    border: "1px solid #30363d",
                                }}
                            >
                                <Lightbulb className="w-4 h-4" />
                                Annotations
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#3fb950" }} />
                        <span style={{ color: "#7d8590" }}>
                            {diffLines.filter((l) => l.type === "added").length} additions
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#f85149" }} />
                        <span style={{ color: "#7d8590" }}>
                            {diffLines.filter((l) => l.type === "removed").length} deletions
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#7d8590" }} />
                        <span style={{ color: "#7d8590" }}>
                            {diffLines.filter((l) => l.type === "unchanged").length} unchanged
                        </span>
                    </div>
                </div>

                {/* Truncation warning */}
                {(beforeLines.length > 500 || afterLines.length > 500) && (
                    <div className="mt-4 flex items-center gap-2 p-3 rounded-lg text-sm" style={{ backgroundColor: "#3d2c00", border: "1px solid #e09e13" }}>
                        <AlertTriangle className="w-4 h-4" style={{ color: "#f0c541" }} />
                        <span style={{ color: "#f0c541" }}>
                            Large file: Showing first 500 lines only. Full file has {Math.max(beforeLines.length, afterLines.length)} lines.
                        </span>
                    </div>
                )}
            </div>

            {/* Diff Content */}
            <div
                className="rounded-lg overflow-hidden"
                style={{ backgroundColor: "#0d1117", border: "1px solid #30363d" }}
            >
                {viewMode === "split" ? (
                    /* Split View */
                    <div className="grid grid-cols-2 divide-x" style={{ borderColor: "#21262d" }}>
                        {/* Before */}
                        <div>
                            <div
                                className="px-4 py-2 border-b"
                                style={{ backgroundColor: "#3d1319", borderColor: "#21262d" }}
                            >
                                <span className="text-sm" style={{ color: "#f85149", fontWeight: "600" }}>
                                    Before
                                </span>
                            </div>
                            <div className="overflow-x-auto overflow-y-auto" style={{ fontFamily: "monospace", fontSize: "0.875rem", height: `${panelHeight}px` }}>
                                <div style={{ minWidth: "max-content" }}>
                                    {beforeLines.slice(0, 500).map((line, idx) => {
                                        const isRemoved = !afterLinesSet.has(line);
                                        const bgColor = isRemoved ? "#3d1319" : "transparent";
                                        const hoverBg = isRemoved ? "#4d1a1f" : "#161b22";
                                        return (
                                            <div
                                                key={idx}
                                                className="flex transition-colors"
                                                style={{ backgroundColor: bgColor }}
                                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
                                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = bgColor)}
                                            >
                                                <div
                                                    className="w-12 flex-shrink-0 text-right pr-4 py-1 select-none border-r"
                                                    style={{ color: isRemoved ? "#f85149" : "#7d8590", borderColor: "#21262d" }}
                                                >
                                                    {idx + 1}
                                                </div>
                                                <div
                                                    className="flex-1 px-4 py-1 whitespace-pre"
                                                    style={{ color: isRemoved ? "#f85149" : "#e6edf3" }}
                                                >
                                                    {line}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* After */}
                        <div>
                            <div
                                className="px-4 py-2 border-b"
                                style={{ backgroundColor: "#033a16", borderColor: "#21262d" }}
                            >
                                <span className="text-sm" style={{ color: "#3fb950", fontWeight: "600" }}>
                                    After
                                </span>
                            </div>
                            <div className="overflow-x-auto overflow-y-auto" style={{ fontFamily: "monospace", fontSize: "0.875rem", height: `${panelHeight}px` }}>
                                <div style={{ minWidth: "max-content" }}>
                                    {afterLines.slice(0, 500).map((line, idx) => {
                                        const annotation = getAnnotationForLine(idx + 1);
                                        const annotationStyle = annotation ? getAnnotationStyle(annotation.type) : null;
                                        const isAdded = !beforeLinesSet.has(line);
                                        const bgColor = isAdded ? "#033a16" : "transparent";
                                        const hoverBg = isAdded ? "#044a1c" : "#161b22";
                                        return (
                                            <div key={idx}>
                                                <div
                                                    className="flex transition-colors"
                                                    style={{ backgroundColor: bgColor }}
                                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverBg)}
                                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = bgColor)}
                                                >
                                                    <div
                                                        className="w-12 flex-shrink-0 text-right pr-4 py-1 select-none border-r"
                                                        style={{ color: isAdded ? "#3fb950" : "#7d8590", borderColor: "#21262d" }}
                                                    >
                                                        {idx + 1}
                                                    </div>
                                                    <div
                                                        className="flex-1 px-4 py-1 whitespace-pre"
                                                        style={{ color: isAdded ? "#3fb950" : "#e6edf3" }}
                                                    >
                                                        {line}
                                                    </div>
                                                </div>

                                                {/* Annotation */}
                                                {annotation && showAnnotations && annotationStyle && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        className="ml-12 mr-4 mb-2 p-3 rounded-lg"
                                                        style={{
                                                            backgroundColor: annotationStyle.bg,
                                                            border: `1px solid ${annotationStyle.border}`,
                                                        }}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <span style={{ color: annotationStyle.text }}>
                                                                {getAnnotationIcon(annotation.type)}
                                                            </span>
                                                            <div className="flex-1">
                                                                <div
                                                                    className="text-xs uppercase tracking-wide mb-1"
                                                                    style={{ color: annotationStyle.text, fontWeight: "600" }}
                                                                >
                                                                    {annotation.type}
                                                                </div>
                                                                <div className="text-sm" style={{ color: "#e6edf3" }}>
                                                                    {annotation.message}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Unified View */
                    <div className="overflow-x-auto" style={{ fontFamily: "monospace", fontSize: "0.875rem" }}>
                        <div style={{ minWidth: "max-content" }}>
                            {diffLines.map((line, idx) => {
                                const annotation = getAnnotationForLine(line.lineNumber);
                                const annotationStyle = annotation ? getAnnotationStyle(annotation.type) : null;
                                const bgColor =
                                    line.type === "added"
                                        ? "#033a16"
                                        : line.type === "removed"
                                            ? "#3d1319"
                                            : "transparent";
                                const textColor =
                                    line.type === "added"
                                        ? "#3fb950"
                                        : line.type === "removed"
                                            ? "#f85149"
                                            : "#e6edf3";
                                const prefix =
                                    line.type === "added" ? "+" : line.type === "removed" ? "-" : " ";

                                return (
                                    <div key={idx}>
                                        <div
                                            className="flex transition-colors"
                                            style={{ backgroundColor: bgColor }}
                                            onMouseEnter={(e) => {
                                                if (line.type === "unchanged") {
                                                    e.currentTarget.style.backgroundColor = "#161b22";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (line.type === "unchanged") {
                                                    e.currentTarget.style.backgroundColor = "transparent";
                                                }
                                            }}
                                        >
                                            <div
                                                className="w-12 flex-shrink-0 text-right pr-4 py-1 select-none border-r"
                                                style={{ color: "#7d8590", borderColor: "#21262d" }}
                                            >
                                                {line.lineNumber}
                                            </div>
                                            <div
                                                className="w-8 flex-shrink-0 text-center py-1"
                                                style={{ color: textColor, fontWeight: "600" }}
                                            >
                                                {prefix}
                                            </div>
                                            <div
                                                className="flex-1 px-4 py-1 whitespace-pre"
                                                style={{ color: textColor }}
                                            >
                                                {line.content}
                                            </div>
                                        </div>

                                        {/* Annotation */}
                                        {annotation && showAnnotations && annotationStyle && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                className="ml-20 mr-4 mb-2 p-3 rounded-lg"
                                                style={{
                                                    backgroundColor: annotationStyle.bg,
                                                    border: `1px solid ${annotationStyle.border}`,
                                                }}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <span style={{ color: annotationStyle.text }}>
                                                        {getAnnotationIcon(annotation.type)}
                                                    </span>
                                                    <div className="flex-1">
                                                        <div
                                                            className="text-xs uppercase tracking-wide mb-1"
                                                            style={{ color: annotationStyle.text, fontWeight: "600" }}
                                                        >
                                                            {annotation.type}
                                                        </div>
                                                        <div className="text-sm" style={{ color: "#e6edf3" }}>
                                                            {annotation.message}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Annotations Summary */}
            {safeAnnotations.length > 0 && (
                <div className="p-6 rounded-lg" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
                    <h3 className="mb-4" style={{ color: "#e6edf3", fontSize: "1.125rem", fontWeight: "600" }}>
                        Annotations Summary ({safeAnnotations.length})
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {safeAnnotations.map((annotation, idx) => {
                            const annotationStyle = getAnnotationStyle(annotation.type);
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="p-3 rounded-lg"
                                    style={{
                                        backgroundColor: annotationStyle.bg,
                                        border: `1px solid ${annotationStyle.border}`,
                                    }}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span style={{ color: annotationStyle.text }}>
                                            {getAnnotationIcon(annotation.type)}
                                        </span>
                                        <span className="text-xs" style={{ color: "#7d8590", fontFamily: "monospace" }}>
                                            Line {annotation.line}
                                        </span>
                                    </div>
                                    <div className="text-sm" style={{ color: "#e6edf3" }}>
                                        {annotation.message}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
