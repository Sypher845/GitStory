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
            "PRSummary": "PR Summary",
            "CommitTimeline": "Commit Timeline",
            "RiskHeatmap": "Risk Heatmap",
            "FileViewer": "File Viewer",
            "RepoSummary": "Repository Overview",
            "ContributorNetwork": "Contributor Network",
            "DiffViewer": "Diff Viewer",
        };

        /**
         * Gets a human-readable component name from a React component
         * Uses multiple strategies to detect the component type
         */
        const getComponentDisplayName = (component: React.ReactNode): string => {
            if (!React.isValidElement(component)) {
                return "Component";
            }

            // Strategy 1: Check the type's name or displayName
            const type = component.type;
            let typeName = "";

            if (typeof type === "function") {
                // Check displayName first (more reliable in production builds)
                typeName = (type as { displayName?: string }).displayName || type.name || "";
            } else if (typeof type === "string") {
                typeName = type;
            } else if (typeof type === "object" && type !== null) {
                // For forwardRef or memo wrapped components
                const typeObj = type as { displayName?: string; render?: { displayName?: string; name?: string } };
                typeName = typeObj.displayName || typeObj.render?.displayName || typeObj.render?.name || "";
            }

            // Check if it's a known component
            for (const [key, value] of Object.entries(COMPONENT_DISPLAY_NAMES)) {
                if (typeName.toLowerCase().includes(key.toLowerCase())) {
                    return value;
                }
            }

            // Strategy 2: Try to infer from the component's children (recursively)
            const props = component.props as { children?: React.ReactNode };
            if (props?.children && React.isValidElement(props.children)) {
                const childType = props.children.type;
                let childTypeName = "";

                if (typeof childType === "function") {
                    childTypeName = (childType as { displayName?: string }).displayName || childType.name || "";
                } else if (typeof childType === "object" && childType !== null) {
                    const childTypeObj = childType as { displayName?: string; render?: { displayName?: string; name?: string } };
                    childTypeName = childTypeObj.displayName || childTypeObj.render?.displayName || childTypeObj.render?.name || "";
                }

                for (const [key, value] of Object.entries(COMPONENT_DISPLAY_NAMES)) {
                    if (childTypeName.toLowerCase().includes(key.toLowerCase())) {
                        return value;
                    }
                }
            }

            // Strategy 3: Check props for component-specific properties
            const componentProps = component.props as Record<string, unknown>;

            // CommitTimeline has 'data' with commits
            if (componentProps.data && Array.isArray(componentProps.data) &&
                componentProps.data.length > 0 &&
                typeof componentProps.data[0] === "object" &&
                componentProps.data[0] !== null &&
                "sha" in componentProps.data[0]) {
                return "Commit Timeline";
            }

            // RepoSummary has 'fullName' and 'structure'
            if (componentProps.fullName && typeof componentProps.fullName === "string" &&
                (componentProps.structure || componentProps.topics)) {
                return "Repository Overview";
            }

            // PRSummary has 'prNumber' or 'prUrl'
            if (componentProps.prNumber || componentProps.prUrl) {
                return "PR Summary";
            }

            // RiskHeatmap has 'files' with risk scores
            if (componentProps.files && Array.isArray(componentProps.files) &&
                componentProps.files.length > 0 &&
                typeof componentProps.files[0] === "object" &&
                componentProps.files[0] !== null &&
                "riskScore" in componentProps.files[0]) {
                return "Risk Heatmap";
            }

            // ContributorNetwork has 'contributors' and 'collaborations'
            if (componentProps.contributors && componentProps.collaborations) {
                return "Contributor Network";
            }

            // Strategy 4: Fallback pattern matching on type name
            const lowerTypeName = typeName.toLowerCase();
            if (lowerTypeName.includes("pr") || lowerTypeName.includes("pull")) return "PR Summary";
            if (lowerTypeName.includes("commit") && lowerTypeName.includes("timeline")) return "Commit Timeline";
            if (lowerTypeName.includes("risk") || lowerTypeName.includes("heatmap")) return "Risk Heatmap";
            if (lowerTypeName.includes("diff")) return "Diff Viewer";
            if (lowerTypeName.includes("repo") || lowerTypeName.includes("summary")) return "Repository Overview";
            if (lowerTypeName.includes("contributor") || lowerTypeName.includes("network")) return "Contributor Network";
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
