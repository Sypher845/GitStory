"use client";

import { cn } from "@/lib/utils";
import { useTambo, type TamboThreadMessage } from "@tambo-ai/react";
import { X } from "lucide-react";
import * as React from "react";

/**
 * Props for the CanvasPanel component
 */
export interface CanvasPanelProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Callback when the panel is closed */
    onClose?: () => void;
}

/**
 * Canvas panel that displays rendered UI components on the right side.
 * Similar to Claude's artifact panel.
 */
export const CanvasPanel = React.forwardRef<HTMLDivElement, CanvasPanelProps>(
    ({ className, onClose, ...props }, ref) => {
        const { thread } = useTambo();
        const [activeMessageId, setActiveMessageId] = React.useState<string | null>(null);

        /**
         * Known component name mappings for better display names
         */
        const COMPONENT_DISPLAY_NAMES: Record<string, string> = {
            "DiffViewer": "Diff Viewer",
            "PRSummary": "PR Summary",
            "CommitTimeline": "Commit Timeline",
            "RiskHeatmap": "Risk Heatmap",
            "FileViewer": "File Viewer",
        };

        /**
         * Gets a human-readable component name from a React component
         */
        const getComponentDisplayName = (component: React.ReactNode): string => {
            if (!React.isValidElement(component)) {
                return "Component";
            }

            const type = component.type;
            let typeName = "";

            if (typeof type === "function") {
                typeName = type.name || "";
            } else if (typeof type === "string") {
                typeName = type;
            }

            // Check if it's a known component
            for (const [key, value] of Object.entries(COMPONENT_DISPLAY_NAMES)) {
                if (typeName.toLowerCase().includes(key.toLowerCase())) {
                    return value;
                }
            }

            // Fallback: try to detect from type name patterns
            const lowerTypeName = typeName.toLowerCase();
            if (lowerTypeName.includes("diff")) return "Diff Viewer";
            if (lowerTypeName.includes("pr") || lowerTypeName.includes("pull")) return "PR Summary";
            if (lowerTypeName.includes("commit") || lowerTypeName.includes("timeline")) return "Commit Timeline";
            if (lowerTypeName.includes("risk") || lowerTypeName.includes("heatmap")) return "Risk Heatmap";
            if (lowerTypeName.includes("file")) return "File Viewer";

            return typeName || "Component";
        };

        // Find all messages with rendered components for the tabs
        const componentsHistory = React.useMemo(() => {
            if (!thread?.messages) return [];

            // First pass: get all components with their base names
            const components = thread.messages
                .filter((m: TamboThreadMessage) => m.role === "assistant" && m.renderedComponent && !m.isCancelled)
                .map((m: TamboThreadMessage) => ({
                    messageId: m.id,
                    component: m.renderedComponent,
                    baseName: getComponentDisplayName(m.renderedComponent),
                }));

            // Count occurrences of each component type
            const typeCounts: Record<string, number> = {};
            const typeInstanceCounts: Record<string, number> = {};

            // First, count total of each type
            components.forEach(c => {
                typeCounts[c.baseName] = (typeCounts[c.baseName] || 0) + 1;
            });

            // Second pass: assign numbered names
            return components.map((c) => {
                typeInstanceCounts[c.baseName] = (typeInstanceCounts[c.baseName] || 0) + 1;
                const instanceNumber = typeInstanceCounts[c.baseName];
                const totalOfType = typeCounts[c.baseName];

                // Only add number if there are multiple of the same type
                const displayName = totalOfType > 1
                    ? `${c.baseName} #${instanceNumber}`
                    : c.baseName;

                return {
                    messageId: c.messageId,
                    component: c.component,
                    label: displayName,
                    componentName: displayName,
                };
            });
        }, [thread?.messages]);

        // Listen for component show events
        React.useEffect(() => {
            const handleShowComponent = (event: CustomEvent<{
                messageId: string;
                component: React.ReactNode;
            }>) => {
                setActiveMessageId(event.detail.messageId);
            };

            window.addEventListener("tambo:showComponent", handleShowComponent as EventListener);
            return () => {
                window.removeEventListener("tambo:showComponent", handleShowComponent as EventListener);
            };
        }, []);

        // Auto-select the latest component when first component appears
        React.useEffect(() => {
            if (componentsHistory.length > 0 && !activeMessageId) {
                // Select the latest (last) component
                const latestComponent = componentsHistory[componentsHistory.length - 1];
                setActiveMessageId(latestComponent.messageId);
            }
        }, [componentsHistory, activeMessageId]);

        // Get the active component from history (always fresh during streaming)
        const activeComponent = React.useMemo(() => {
            if (!activeMessageId) return null;
            return componentsHistory.find(c => c.messageId === activeMessageId) || null;
        }, [activeMessageId, componentsHistory]);

        const handleClose = () => {
            setActiveMessageId(null);
            onClose?.();
        };

        // Don't render if no components are available
        if (componentsHistory.length === 0) {
            return null;
        }

        return (
            <div
                ref={ref}
                className={cn(
                    "flex flex-col bg-[#0d1117] border-l border-[#30363d] relative",
                    className
                )}
                data-canvas-space="true"
                {...props}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363d] bg-[#161b22]">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#e6edf3]">
                            {activeComponent
                                ? activeComponent.componentName
                                : "Components"
                            }
                        </span>
                        {componentsHistory.length > 1 && (
                            <span className="text-xs text-[#7d8590] bg-[#21262d] px-2 py-0.5 rounded-full">
                                {componentsHistory.length}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleClose}
                            className="p-1.5 rounded hover:bg-[#21262d] text-[#7d8590] hover:text-[#e6edf3] transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Component content */}
                <div
                    className="flex-1 overflow-auto p-4"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "#30363d #0d1117" }}
                >
                    {activeComponent ? (
                        <div className="w-full">
                            {activeComponent.component}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-[#7d8590]">
                            <p className="text-sm">Select a component to view</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }
);

CanvasPanel.displayName = "CanvasPanel";
