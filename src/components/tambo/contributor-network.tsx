"use client";

import { useState } from "react";
import { Users, GitCommit, UserCheck } from "lucide-react";
import { z } from "zod";

// Schema for Tambo registration
const ContributorSchema = z.object({
    id: z.string().describe("Unique identifier for the contributor (e.g., GitHub username)"),
    name: z.string().describe("Display name of the contributor"),
    commits: z.number().describe("Total number of commits by this contributor"),
});

const CollaborationSchema = z.object({
    source: z.string().describe("ID of the first contributor in the collaboration"),
    target: z.string().describe("ID of the second contributor in the collaboration"),
    sharedFiles: z.number().describe("Number of files both contributors have worked on"),
});

export const contributorNetworkSchema = z.object({
    contributors: z.array(ContributorSchema).describe("Array of contributors with their stats. Fetch from GitHub API contributors endpoint."),
    collaborations: z.array(CollaborationSchema).optional().describe("Optional array of collaborations between contributors based on shared file edits."),
}).describe("Displays an interactive network visualization of repository contributors and their collaborations. Use when the user asks about contributors, team members, who worked on the repo, or collaboration patterns.");

interface Contributor {
    id: string;
    name: string;
    commits: number;
}

interface Collaboration {
    source: string;
    target: string;
    sharedFiles: number;
}

interface ContributorNetworkProps {
    contributors?: Contributor[];
    collaborations?: Collaboration[];
}

export function ContributorNetwork({ contributors, collaborations }: ContributorNetworkProps) {
    const [selectedContributor, setSelectedContributor] = useState<Contributor | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    // Zoom and pan state
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    // Safely handle null/undefined collaborations
    const safeCollaborations = collaborations ?? [];

    // Handle undefined data during streaming
    if (!contributors || contributors.length === 0) {
        return (
            <div className="rounded-xl p-8" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
                <div className="animate-pulse">
                    <div className="h-8 w-48 bg-gray-700 rounded mb-4" />
                    <div className="h-4 w-64 bg-gray-700 rounded mb-8" />
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="h-24 bg-gray-700 rounded" />
                        <div className="h-24 bg-gray-700 rounded" />
                        <div className="h-24 bg-gray-700 rounded" />
                    </div>
                    <div className="h-64 bg-gray-700 rounded" />
                </div>
            </div>
        );
    }

    // Create a random but deterministic layout based on contributor id
    const seededRandom = (seed: string) => {
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            const char = seed.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash % 1000) / 1000;
    };

    const graphWidth = 800;
    const graphHeight = 500;
    const padding = 100;

    // Calculate min/max commits for proportional sizing
    const validContributors = contributors.filter(c => typeof c.commits === 'number' && !isNaN(c.commits));
    const maxCommits = validContributors.length > 0 ? Math.max(...validContributors.map(c => c.commits)) : 1;
    const minCommits = validContributors.length > 0 ? Math.min(...validContributors.map(c => c.commits)) : 0;
    const commitRange = maxCommits - minCommits || 1;

    // First pass: create initial positions with seeded random
    const initialNodes = contributors.map((contributor, index) => {
        const seedX = seededRandom(contributor.id || `${index}x`);
        const seedY = seededRandom((contributor.id || `${index}`) + 'y');
        const commits = contributor.commits ?? 0;
        const normalizedSize = (commits - minCommits) / commitRange;
        const nodeRadius = isNaN(normalizedSize) ? 35 : 30 + normalizedSize * 40;

        return {
            ...contributor,
            x: padding + seedX * (graphWidth - padding * 2),
            y: padding + seedY * (graphHeight - padding * 2),
            radius: nodeRadius,
        };
    });

    // Collision avoidance: push overlapping nodes apart
    const resolveCollisions = (nodes: typeof initialNodes) => {
        const result = nodes.map(n => ({ ...n }));
        const iterations = 50;
        const minDistance = 20; // Minimum gap between nodes

        for (let iter = 0; iter < iterations; iter++) {
            for (let i = 0; i < result.length; i++) {
                for (let j = i + 1; j < result.length; j++) {
                    const dx = result[j].x - result[i].x;
                    const dy = result[j].y - result[i].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = result[i].radius + result[j].radius + minDistance;

                    if (dist < minDist && dist > 0) {
                        const overlap = (minDist - dist) / 2;
                        const normalX = dx / dist;
                        const normalY = dy / dist;

                        result[i].x -= normalX * overlap;
                        result[i].y -= normalY * overlap;
                        result[j].x += normalX * overlap;
                        result[j].y += normalY * overlap;

                        // Keep within bounds
                        result[i].x = Math.max(padding, Math.min(graphWidth - padding, result[i].x));
                        result[i].y = Math.max(padding, Math.min(graphHeight - padding, result[i].y));
                        result[j].x = Math.max(padding, Math.min(graphWidth - padding, result[j].x));
                        result[j].y = Math.max(padding, Math.min(graphHeight - padding, result[j].y));
                    }
                }
            }
        }
        return result;
    };

    const positionedContributors = resolveCollisions(initialNodes);

    const getCollaborators = (contributorId: string) => {
        return safeCollaborations
            .filter((c) => c.source === contributorId || c.target === contributorId)
            .map((c) => {
                const otherId = c.source === contributorId ? c.target : c.source;
                const other = contributors.find((cont) => cont.id === otherId);
                return {
                    ...other!,
                    sharedFiles: c.sharedFiles,
                };
            })
            .filter(c => c.id); // Filter out undefined
    };

    const totalCommits = contributors.reduce((sum, c) => sum + (c.commits ?? 0), 0);

    return (
        <div className="rounded-xl p-8" style={{ backgroundColor: "#161b22", border: "1px solid #30363d" }}>
            {/* Header */}
            <div className="mb-6">
                <h1 style={{ color: "#e6edf3", marginBottom: "0.5rem" }}>Contributor Network</h1>
                <p style={{ color: "#7d8590", fontSize: "0.875rem" }}>
                    {contributors.length} contributors • {totalCommits} total commits
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="rounded-lg p-4" style={{ backgroundColor: "#0d1117", border: "1px solid #30363d" }}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: "#161b22" }}>
                            <Users className="w-5 h-5" style={{ color: "#58a6ff" }} />
                        </div>
                        <span style={{ color: "#7d8590", fontSize: "0.875rem" }}>Total Contributors</span>
                    </div>
                    <div style={{ color: "#e6edf3", fontSize: "1.875rem", fontWeight: "600" }}>
                        {contributors.length}
                    </div>
                </div>

                <div className="rounded-lg p-4" style={{ backgroundColor: "#0d1117", border: "1px solid #30363d" }}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: "#161b22" }}>
                            <GitCommit className="w-5 h-5" style={{ color: "#3fb950" }} />
                        </div>
                        <span style={{ color: "#7d8590", fontSize: "0.875rem" }}>Total Commits</span>
                    </div>
                    <div style={{ color: "#e6edf3", fontSize: "1.875rem", fontWeight: "600" }}>
                        {totalCommits}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Network Graph */}
                <div className="xl:col-span-2 rounded-lg p-6" style={{ backgroundColor: "#0d1117", border: "1px solid #30363d" }}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 style={{ color: "#e6edf3", fontSize: "1.125rem", marginBottom: "0.25rem" }}>
                                Collaboration Network
                            </h2>
                            <p style={{ color: "#7d8590", fontSize: "0.875rem" }}>
                                Click on a node to view contributor details
                            </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs" style={{ color: "#7d8590" }}>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#3fb950" }} />
                                <span>Active</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#58a6ff" }} />
                                <span>Selected</span>
                            </div>
                        </div>
                    </div>

                    {/* Zoom controls */}
                    <div className="flex items-center gap-2 mb-2">
                        <button
                            onClick={() => setZoom(z => Math.min(z + 0.2, 3))}
                            className="px-3 py-1 rounded text-sm"
                            style={{ backgroundColor: "#21262d", color: "#e6edf3", border: "1px solid #30363d" }}
                        >
                            +
                        </button>
                        <button
                            onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))}
                            className="px-3 py-1 rounded text-sm"
                            style={{ backgroundColor: "#21262d", color: "#e6edf3", border: "1px solid #30363d" }}
                        >
                            −
                        </button>
                        <button
                            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
                            className="px-3 py-1 rounded text-sm"
                            style={{ backgroundColor: "#21262d", color: "#e6edf3", border: "1px solid #30363d" }}
                        >
                            Reset
                        </button>
                        <span className="text-xs" style={{ color: "#7d8590" }}>
                            {Math.round(zoom * 100)}% | Scroll to zoom, drag to pan
                        </span>
                    </div>

                    <div
                        className="rounded-lg overflow-hidden"
                        style={{ backgroundColor: "#161b22", border: "1px solid #21262d", height: "400px", cursor: isPanning ? 'grabbing' : 'grab' }}
                        onWheel={(e) => {
                            e.preventDefault();
                            const delta = e.deltaY > 0 ? -0.1 : 0.1;
                            setZoom(z => Math.max(0.5, Math.min(3, z + delta)));
                        }}
                        onMouseDown={(e) => {
                            setIsPanning(true);
                            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
                        }}
                        onMouseMove={(e) => {
                            if (isPanning) {
                                setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
                            }
                        }}
                        onMouseUp={() => setIsPanning(false)}
                        onMouseLeave={() => setIsPanning(false)}
                    >
                        <svg width="100%" height="100%" viewBox="0 0 800 500">
                            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                                <defs>
                                    <filter id="contributor-glow">
                                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>

                                {/* Draw collaboration lines */}
                                {safeCollaborations.map((collab, idx) => {
                                    const fromNode = positionedContributors.find((c) => c.id === collab.source);
                                    const toNode = positionedContributors.find((c) => c.id === collab.target);
                                    if (!fromNode || !toNode) return null;

                                    const isHighlighted =
                                        selectedContributor?.id === collab.source ||
                                        selectedContributor?.id === collab.target;

                                    return (
                                        <g key={idx}>
                                            <line
                                                x1={fromNode.x}
                                                y1={fromNode.y}
                                                x2={toNode.x}
                                                y2={toNode.y}
                                                stroke={isHighlighted ? "#3fb950" : "#30363d"}
                                                strokeWidth={isHighlighted ? "3" : "2"}
                                                opacity={isHighlighted ? "0.6" : "0.3"}
                                                strokeDasharray={isHighlighted ? "0" : "4 4"}
                                            />
                                            <text
                                                x={(fromNode.x + toNode.x) / 2}
                                                y={(fromNode.y + toNode.y) / 2}
                                                fill="#7d8590"
                                                fontSize="10"
                                                textAnchor="middle"
                                                style={{ pointerEvents: "none", userSelect: "none" }}
                                            >
                                                {isHighlighted ? `${collab.sharedFiles}` : ""}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Draw contributor nodes */}
                                {positionedContributors.map((contributor) => {
                                    const isSelected = selectedContributor?.id === contributor.id;
                                    const isHovered = hoveredNode === contributor.id;
                                    const nodeColor = isSelected ? "#58a6ff" : "#3fb950";

                                    return (
                                        <g key={contributor.id}>
                                            {/* Outer glow for selected/hovered */}
                                            {(isSelected || isHovered) && (
                                                <circle
                                                    cx={contributor.x}
                                                    cy={contributor.y}
                                                    r={contributor.radius + 8}
                                                    fill="none"
                                                    stroke={nodeColor}
                                                    strokeWidth="2"
                                                    opacity="0.3"
                                                />
                                            )}

                                            {/* Main node circle */}
                                            <circle
                                                cx={contributor.x || 0}
                                                cy={contributor.y || 0}
                                                r={contributor.radius || 25}
                                                fill="#0d1117"
                                                stroke={nodeColor}
                                                strokeWidth="3"
                                                style={{
                                                    cursor: "pointer",
                                                    filter: isSelected || isHovered ? "url(#contributor-glow)" : "none",
                                                    transition: "all 0.3s ease",
                                                }}
                                                onMouseEnter={() => setHoveredNode(contributor.id)}
                                                onMouseLeave={() => setHoveredNode(null)}
                                                onClick={() => setSelectedContributor(contributor)}
                                            />

                                            {/* Label */}
                                            <text
                                                x={contributor.x || 0}
                                                y={(contributor.y || 0) - (contributor.radius || 25) - 15}
                                                textAnchor="middle"
                                                fill="#e6edf3"
                                                fontSize="18"
                                                fontWeight={isSelected ? "600" : "400"}
                                                style={{
                                                    pointerEvents: "none",
                                                    userSelect: "none",
                                                }}
                                            >
                                                {contributor.name?.split(" ")[0] ?? contributor.id}
                                            </text>

                                            {/* Commit count inside circle */}
                                            <text
                                                x={contributor.x || 0}
                                                y={(contributor.y || 0) + 5}
                                                textAnchor="middle"
                                                fill={nodeColor}
                                                fontSize={Math.min(22, Math.max(12, (contributor.radius || 25) * 0.5))}
                                                fontWeight="600"
                                                style={{ pointerEvents: "none", userSelect: "none" }}
                                            >
                                                {contributor.commits ?? 0}
                                            </text>
                                        </g>
                                    );
                                })}
                            </g>
                        </svg>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Selected Contributor Details */}
                    {selectedContributor ? (
                        <div
                            className="rounded-lg p-6"
                            style={{ backgroundColor: "#0d1117", border: "1px solid #58a6ff" }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 style={{ color: "#e6edf3", fontSize: "1.125rem", marginBottom: "0.25rem" }}>
                                        {selectedContributor.name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div
                                            className="px-2 py-1 rounded text-xs"
                                            style={{ backgroundColor: "#238636", color: "#ffffff" }}
                                        >
                                            Active Contributor
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className="p-2 rounded-lg"
                                    style={{ backgroundColor: "#161b22" }}
                                >
                                    <UserCheck className="w-5 h-5" style={{ color: "#58a6ff" }} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-lg" style={{ backgroundColor: "#161b22" }}>
                                    <div className="text-xs mb-1" style={{ color: "#7d8590" }}>
                                        Commits
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span style={{ color: "#e6edf3", fontSize: "1.5rem", fontWeight: "600" }}>
                                            {selectedContributor.commits}
                                        </span>
                                        <span style={{ color: "#3fb950", fontSize: "0.75rem" }}>
                                            {((selectedContributor.commits / totalCommits) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                </div>

                                {getCollaborators(selectedContributor.id).length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <span style={{ color: "#7d8590", fontSize: "0.875rem" }}>
                                                Collaborations
                                            </span>
                                            <span
                                                className="px-2 py-1 rounded text-xs"
                                                style={{ backgroundColor: "#161b22", color: "#e6edf3" }}
                                            >
                                                {getCollaborators(selectedContributor.id).length}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {getCollaborators(selectedContributor.id).map((collaborator) => (
                                                <div
                                                    key={collaborator.id}
                                                    className="p-3 rounded-lg"
                                                    style={{ backgroundColor: "#161b22", border: "1px solid #21262d" }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span style={{ color: "#e6edf3", fontSize: "0.875rem" }}>
                                                            {collaborator.name}
                                                        </span>
                                                        <span style={{ color: "#7d8590", fontSize: "0.75rem" }}>
                                                            {collaborator.sharedFiles} files
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div
                            className="rounded-lg p-6 text-center"
                            style={{ backgroundColor: "#0d1117", border: "1px solid #30363d" }}
                        >
                            <div className="p-3 rounded-lg inline-block mb-3" style={{ backgroundColor: "#161b22" }}>
                                <Users className="w-8 h-8" style={{ color: "#7d8590" }} />
                            </div>
                            <p style={{ color: "#7d8590", fontSize: "0.875rem" }}>
                                Select a contributor from the network graph to view their details
                            </p>
                        </div>
                    )}

                    {/* Top Contributors List */}
                    <div className="rounded-lg p-6" style={{ backgroundColor: "#0d1117", border: "1px solid #30363d" }}>
                        <h3 style={{ color: "#e6edf3", fontSize: "1rem", marginBottom: "1rem" }}>
                            Top Contributors
                        </h3>
                        <div className="space-y-2">
                            {[...contributors]
                                .sort((a, b) => b.commits - a.commits)
                                .slice(0, 5)
                                .map((contributor, index) => (
                                    <div
                                        key={contributor.id || index}
                                        className="p-3 rounded-lg cursor-pointer transition-all"
                                        style={{
                                            backgroundColor:
                                                selectedContributor?.id === contributor.id ? "#161b22" : "transparent",
                                            border:
                                                selectedContributor?.id === contributor.id
                                                    ? "1px solid #58a6ff"
                                                    : "1px solid transparent",
                                        }}
                                        onClick={() => setSelectedContributor(contributor)}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span style={{ color: "#e6edf3", fontSize: "0.875rem" }}>
                                                {contributor.name}
                                            </span>
                                            <span
                                                className="px-2 py-0.5 rounded text-xs"
                                                style={{
                                                    backgroundColor: index === 0 ? "#238636" : "#30363d",
                                                    color: index === 0 ? "#ffffff" : "#7d8590",
                                                    fontWeight: index === 0 ? "600" : "normal",
                                                }}
                                            >
                                                #{index + 1}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs" style={{ color: "#7d8590" }}>
                                            <span>{contributor.commits} commits</span>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="mt-8 pt-6 grid grid-cols-3 gap-8" style={{ borderTop: "1px solid #30363d" }}>
                <div className="text-center">
                    <div className="text-3xl mb-1" style={{ color: "#a371f7" }}>
                        {contributors.length}
                    </div>
                    <div className="text-sm" style={{ color: "#7d8590" }}>
                        Contributors
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-3xl mb-1" style={{ color: "#3fb950" }}>
                        {totalCommits}
                    </div>
                    <div className="text-sm" style={{ color: "#7d8590" }}>
                        Total Commits
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-3xl mb-1" style={{ color: "#58a6ff" }}>
                        {safeCollaborations.length}
                    </div>
                    <div className="text-sm" style={{ color: "#7d8590" }}>
                        Collaborations
                    </div>
                </div>
            </div>
        </div>
    );
}
