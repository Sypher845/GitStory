"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, TrendingUp, Code, Activity, Shield } from "lucide-react";
import { z } from "zod";

// --- Schema ---

const riskFileSchema = z.object({
  path: z.string().default("unknown"),
  riskScore: z.number().default(0),
  factors: z
    .object({
      churn: z.number().default(0),
      complexity: z.number().default(0),
      testCoverage: z.number().default(0),
      recentChanges: z.number().default(0),
    })
    .default({ churn: 0, complexity: 0, testCoverage: 0, recentChanges: 0 }),
  commits: z.array(z.string()).default([]),
});

export const riskHeatmapSchema = z.object({
  files: z.array(riskFileSchema).default([]),
  threshold: z.enum(["low", "medium", "high", "critical"]).optional(),
  commitSha: z.string().optional(),
});

// --- Types ---

interface RiskFile {
  path: string;
  riskScore: number;
  factors: {
    churn: number;
    complexity: number;
    testCoverage: number;
    recentChanges: number;
  };
  commits: string[];
}

interface RiskHeatmapProps {
  files: RiskFile[];
  threshold?: "low" | "medium" | "high" | "critical";
  commitSha?: string;
  onThresholdChange?: (
    threshold: "low" | "medium" | "high" | "critical"
  ) => void;
}

// --- Component ---

export function RiskHeatmap({
  files = [],
  threshold: initialThreshold = "medium",
  commitSha,
  onThresholdChange,
}: RiskHeatmapProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"risk" | "churn" | "complexity">(
    "risk"
  );
  const [threshold, setThreshold] = useState<"low" | "medium" | "high" | "critical">(initialThreshold);
  const [hasAutoAdjusted, setHasAutoAdjusted] = useState(false);

  const handleThresholdChange = (t: "low" | "medium" | "high" | "critical") => {
    setThreshold(t);
    onThresholdChange?.(t);
  };

  const defaultFactors = { churn: 0, complexity: 0, testCoverage: 0, recentChanges: 0 };

  // Normalize files — Tambo AI may send incomplete objects or 0-1 scale scores
  const rawFiles = files.map((f) => ({
    path: f?.path ?? "unknown",
    riskScore: f?.riskScore ?? 0,
    factors: {
      churn: f?.factors?.churn ?? 0,
      complexity: f?.factors?.complexity ?? 0,
      testCoverage: f?.factors?.testCoverage ?? 0,
      recentChanges: f?.factors?.recentChanges ?? 0,
    },
    commits: Array.isArray(f?.commits) ? f.commits : [],
  }));

  // Auto-detect if scores are 0-1 scale and normalize to 0-100
  const maxScore = rawFiles.length > 0 ? Math.max(...rawFiles.map((f) => f.riskScore)) : 0;
  const safeFiles = rawFiles.map((f) => ({
    ...f,
    riskScore: maxScore <= 1 ? Math.round(f.riskScore * 100) : f.riskScore,
  }));

  const thresholdValues: Record<string, number> = {
    low: 25,
    medium: 50,
    high: 75,
    critical: 90,
  };

  // Auto-adjust threshold if current level shows 0 files but files exist
  const thresholdLevels: ("low" | "medium" | "high" | "critical")[] = ["critical", "high", "medium", "low"];
  if (!hasAutoAdjusted && safeFiles.length > 0) {
    const currentCount = safeFiles.filter((f) => f.riskScore >= thresholdValues[threshold]).length;
    if (currentCount === 0) {
      const bestLevel = thresholdLevels.find(
        (lvl) => safeFiles.filter((f) => f.riskScore >= thresholdValues[lvl]).length > 0
      ) ?? "low";
      if (bestLevel !== threshold) {
        setThreshold(bestLevel);
        setHasAutoAdjusted(true);
      }
    }
  }

  const filteredFiles = safeFiles.filter(
    (f) => f.riskScore >= thresholdValues[threshold]
  );

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    if (sortBy === "risk") return b.riskScore - a.riskScore;
    if (sortBy === "churn") return b.factors.churn - a.factors.churn;
    return b.factors.complexity - a.factors.complexity;
  });

  // Early return skeleton when no data yet
  if (safeFiles.length === 0) {
    return (
      <div className="w-full space-y-4">
        <div className="rounded-lg p-6" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-5 h-5" style={{ color: "#3fb950" }} />
            <h2 style={{ color: "#c9d1d9", fontSize: "1.5rem", fontWeight: "600" }}>Risk Heatmap</h2>
          </div>
          <p style={{ color: "#7d8590", fontSize: "0.875rem" }}>No files to analyze yet.</p>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg p-5 animate-pulse" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full" style={{ backgroundColor: "#21262d" }} />
              <div className="flex-1 space-y-3">
                <div className="h-5 rounded w-1/3" style={{ backgroundColor: "#21262d" }} />
                <div className="h-3 rounded w-1/2" style={{ backgroundColor: "#21262d" }} />
                <div className="h-2 rounded w-full" style={{ backgroundColor: "#21262d" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getRiskLevel = (score: number) => {
    if (score >= 90)
      return {
        label: "CRITICAL",
        color: "#da3633",
        bgColor: "#1c1012",
        borderColor: "#6e302e",
      };
    if (score >= 75)
      return {
        label: "HIGH",
        color: "#d29922",
        bgColor: "#1a1604",
        borderColor: "#5c4616",
      };
    if (score >= 50)
      return {
        label: "MEDIUM",
        color: "#bb8009",
        bgColor: "#171304",
        borderColor: "#4b3a12",
      };
    return {
      label: "LOW",
      color: "#3fb950",
      bgColor: "#0f1b13",
      borderColor: "#26553a",
    };
  };

  const getFileName = (path: string) => {
    const parts = path.split("/");
    return parts[parts.length - 1];
  };

  const getDirectory = (path: string) => {
    const parts = path.split("/");
    return parts.slice(0, -1).join("/");
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div
        className="rounded-lg p-6"
        style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield
                className="w-5 h-5"
                style={{ color: "#3fb950" }}
              />
              <h2
                style={{
                  color: "#c9d1d9",
                  fontSize: "1.5rem",
                  fontWeight: "600",
                }}
              >
                Risk Heatmap
              </h2>
              {commitSha && (
                <span
                  className="px-2.5 py-1 rounded-md text-xs"
                  style={{
                    backgroundColor: "#0d1117",
                    border: "1px solid #21262d",
                    color: "#8b949e",
                    fontFamily: "var(--font-family-mono)",
                  }}
                >
                  {commitSha.substring(0, 7)}
                </span>
              )}
            </div>
            <p
              style={{
                color: "#7d8590",
                fontSize: "0.875rem",
                fontFamily: "var(--font-family-mono)",
              }}
            >
              {filteredFiles.length} files above {threshold} risk threshold
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-6">
          {/* Sort By */}
          <div>
            <label
              className="text-xs mb-2 block uppercase tracking-wide"
              style={{ color: "#7d8590" }}
            >
              Sort By
            </label>
            <div
              className="flex rounded-lg p-1"
              style={{ backgroundColor: "#0d1117" }}
            >
              {(["risk", "churn", "complexity"] as const).map((sort) => (
                <button
                  key={sort}
                  onClick={() => setSortBy(sort)}
                  className="flex-1 px-4 py-2 rounded text-sm transition-all"
                  style={{
                    backgroundColor:
                      sortBy === sort ? "#238636" : "transparent",
                    color: sortBy === sort ? "#ffffff" : "#484f58",
                    fontWeight: sortBy === sort ? "600" : "400",
                    border: sortBy === sort ? "1px solid #2ea043" : "1px solid transparent",
                  }}
                >
                  {sort.charAt(0).toUpperCase() + sort.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Threshold */}
          <div>
            <label
              className="text-xs mb-2 block uppercase tracking-wide"
              style={{ color: "#7d8590" }}
            >
              Risk Threshold
            </label>
            <div
              className="flex rounded-lg p-1"
              style={{ backgroundColor: "#0d1117" }}
            >
              {(["low", "medium", "high", "critical"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleThresholdChange(t)}
                  className="flex-1 px-3 py-2 rounded text-sm transition-all capitalize"
                  style={{
                    backgroundColor:
                      threshold === t ? "#238636" : "transparent",
                    color: threshold === t ? "#ffffff" : "#484f58",
                    fontWeight: threshold === t ? "600" : "400",
                    border: threshold === t ? "1px solid #2ea043" : "1px solid transparent",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="space-y-3">
        {sortedFiles.map((file, index) => {
          const risk = getRiskLevel(file.riskScore);
          const isSelected = selectedFile === file.path;

          return (
            <motion.div
              key={file.path}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => setSelectedFile(isSelected ? null : file.path)}
              className="cursor-pointer rounded-lg"
              style={{
                backgroundColor: "#161b22",
                border: `1px solid ${isSelected ? risk.borderColor : "#21262d"}`,
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                boxShadow: isSelected ? `0 0 0 1px ${risk.borderColor}22` : "none",
              }}
            >
              <div className="p-5">
                <div className="flex items-center gap-6">
                  {/* Risk Score Badge */}
                  <div className="relative flex-shrink-0">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: risk.bgColor,
                        border: `2px solid ${risk.borderColor}`,
                      }}
                    >
                      <div className="text-center">
                        <div
                          className="text-2xl"
                          style={{ fontWeight: "700", color: risk.color }}
                        >
                          {file.riskScore}
                        </div>
                        <div
                          className="text-[10px] uppercase tracking-wider"
                          style={{ color: "#7d8590" }}
                        >
                          {risk.label}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3
                        className="text-xl truncate"
                        style={{ fontWeight: "600", color: "#c9d1d9" }}
                      >
                        {getFileName(file.path)}
                      </h3>
                      <span
                        className="px-3 py-1 rounded-full text-xs"
                        style={{
                          backgroundColor: "#0d1117",
                          border: "1px solid #30363d",
                          color: "#7d8590",
                          fontFamily: "var(--font-family-mono)",
                        }}
                      >
                        {(file.commits?.length ?? 0)} commits
                      </span>
                    </div>
                    <p
                      className="text-sm truncate"
                      style={{
                        color: "#7d8590",
                        fontFamily: "var(--font-family-mono)",
                      }}
                    >
                      {getDirectory(file.path)}
                    </p>

                    {/* Risk Factors Bar */}
                    <div className="mt-4 grid grid-cols-4 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp
                              className="w-3 h-3"
                              style={{ color: "#388bfd" }}
                            />
                            <span
                              className="text-xs"
                              style={{ color: "#7d8590" }}
                            >
                              Churn
                            </span>
                          </div>
                          <span
                            className="text-xs"
                            style={{ fontWeight: "500", color: "#8b949e" }}
                          >
                            {file.factors.churn}
                          </span>
                        </div>
                        <div
                          className="h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: "#21262d" }}
                        >
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.min(file.factors.churn * 2, 100)}%`,
                              backgroundColor: "#388bfd",
                              opacity: 0.7,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Code
                              className="w-3 h-3"
                              style={{ color: "#8b7fcf" }}
                            />
                            <span
                              className="text-xs"
                              style={{ color: "#7d8590" }}
                            >
                              Complexity
                            </span>
                          </div>
                          <span
                            className="text-xs"
                            style={{ fontWeight: "500", color: "#8b949e" }}
                          >
                            {file.factors.complexity}
                          </span>
                        </div>
                        <div
                          className="h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: "#21262d" }}
                        >
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.min(file.factors.complexity / 2, 100)}%`,
                              backgroundColor: "#8b7fcf",
                              opacity: 0.7,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <Activity
                              className="w-3 h-3"
                              style={{ color: "#3fb950" }}
                            />
                            <span
                              className="text-xs"
                              style={{ color: "#7d8590" }}
                            >
                              Coverage
                            </span>
                          </div>
                          <span
                            className="text-xs"
                            style={{ fontWeight: "500", color: "#8b949e" }}
                          >
                            {file.factors.testCoverage}%
                          </span>
                        </div>
                        <div
                          className="h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: "#21262d" }}
                        >
                          <div
                            className="h-full"
                            style={{
                              width: `${file.factors.testCoverage}%`,
                              backgroundColor: "#3fb950",
                              opacity: 0.7,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle
                              className="w-3 h-3"
                              style={{ color: "#d29922" }}
                            />
                            <span
                              className="text-xs"
                              style={{ color: "#7d8590" }}
                            >
                              Recent
                            </span>
                          </div>
                          <span
                            className="text-xs"
                            style={{ fontWeight: "500", color: "#8b949e" }}
                          >
                            {file.factors.recentChanges}
                          </span>
                        </div>
                        <div
                          className="h-2 rounded-full overflow-hidden"
                          style={{ backgroundColor: "#21262d" }}
                        >
                          <div
                            className="h-full"
                            style={{
                              width: `${Math.min(file.factors.recentChanges * 10, 100)}%`,
                              backgroundColor: "#d29922",
                              opacity: 0.7,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    className="px-5 py-2.5 rounded-md text-sm flex-shrink-0"
                    style={{
                      backgroundColor: "#21262d",
                      color: "#c9d1d9",
                      fontWeight: "500",
                      border: "1px solid #30363d",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#238636";
                      e.currentTarget.style.borderColor = "#2ea043";
                      e.currentTarget.style.color = "#ffffff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#21262d";
                      e.currentTarget.style.borderColor = "#30363d";
                      e.currentTarget.style.color = "#c9d1d9";
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(isSelected ? null : file.path);
                    }}
                  >
                    Review
                  </button>
                </div>

                {/* Expanded Section */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="mt-5 pt-5 overflow-hidden"
                      style={{ borderTop: "1px solid #21262d" }}
                    >
                      <h4
                        className="text-sm mb-3"
                        style={{ fontWeight: "600", color: "#c9d1d9" }}
                      >
                        Risk Analysis
                      </h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div
                          className="p-4 rounded-lg"
                          style={{
                            backgroundColor: "#0d1117",
                            borderLeft: `3px solid ${risk.color}`,
                            borderTop: "1px solid #21262d",
                            borderRight: "1px solid #21262d",
                            borderBottom: "1px solid #21262d",
                          }}
                        >
                          <div
                            className="text-xs uppercase tracking-wide mb-2"
                            style={{ color: "#484f58", letterSpacing: "0.05em" }}
                          >
                            PRIMARY CONCERN
                          </div>
                          <div
                            className="text-base"
                            style={{ fontWeight: "600", color: "#c9d1d9" }}
                          >
                            {file.factors.testCoverage < 50
                              ? "Insufficient Test Coverage"
                              : file.factors.churn > 10
                                ? "High Churn Rate"
                                : "Code Complexity"}
                          </div>
                        </div>
                        <div
                          className="p-4 rounded-lg"
                          style={{
                            backgroundColor: "#0d1117",
                            borderLeft: `3px solid #238636`,
                            borderTop: "1px solid #21262d",
                            borderRight: "1px solid #21262d",
                            borderBottom: "1px solid #21262d",
                          }}
                        >
                          <div
                            className="text-xs uppercase tracking-wide mb-2"
                            style={{ color: "#484f58", letterSpacing: "0.05em" }}
                          >
                            RECOMMENDATION
                          </div>
                          <div
                            className="text-base"
                            style={{ fontWeight: "600", color: "#3fb950" }}
                          >
                            {file.factors.testCoverage < 50
                              ? "Add Unit Tests"
                              : "Review & Refactor"}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div
                          className="text-xs uppercase tracking-wide mb-2"
                          style={{ color: "#7d8590" }}
                        >
                          RECENT COMMITS
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(file.commits ?? []).slice(0, 8).map((sha) => (
                            <span
                              key={sha}
                              className="px-2.5 py-1 rounded-md text-xs"
                              style={{
                                backgroundColor: "#0d1117",
                                border: "1px solid #21262d",
                                color: "#8b949e",
                                fontFamily: "var(--font-family-mono)",
                              }}
                            >
                              {sha.substring(0, 7)}
                            </span>
                          ))}
                          {(file.commits?.length ?? 0) > 8 && (
                            <span
                              className="px-2 py-1 text-xs italic"
                              style={{ color: "#7d8590" }}
                            >
                              +{(file.commits?.length ?? 0) - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div
        className="p-6 rounded-lg"
        style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}
      >
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center">
            <div
              className="text-3xl mb-2"
              style={{ fontWeight: "700", color: "#da3633" }}
            >
              {safeFiles.filter((f) => f.riskScore >= 90).length}
            </div>
            <div
              className="text-xs uppercase tracking-wide"
              style={{ color: "#7d8590" }}
            >
              Critical Risk
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-3xl mb-2"
              style={{ fontWeight: "700", color: "#d29922" }}
            >
              {safeFiles.filter((f) => f.riskScore >= 75 && f.riskScore < 90).length}
            </div>
            <div
              className="text-xs uppercase tracking-wide"
              style={{ color: "#7d8590" }}
            >
              High Risk
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-3xl mb-2"
              style={{ fontWeight: "700", color: "#bb8009" }}
            >
              {safeFiles.filter((f) => f.riskScore >= 50 && f.riskScore < 75).length}
            </div>
            <div
              className="text-xs uppercase tracking-wide"
              style={{ color: "#7d8590" }}
            >
              Medium Risk
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-3xl mb-2"
              style={{ fontWeight: "700", color: "#3fb950" }}
            >
              {safeFiles.filter((f) => f.riskScore < 50).length}
            </div>
            <div
              className="text-xs uppercase tracking-wide"
              style={{ color: "#7d8590" }}
            >
              Low Risk
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
