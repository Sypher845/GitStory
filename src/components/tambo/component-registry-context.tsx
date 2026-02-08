"use client";

import * as React from "react";
import { useTambo, type TamboThreadMessage } from "@tambo-ai/react";

/**
 * Known component name mappings for better display names
 */
const COMPONENT_DISPLAY_NAMES: Record<string, { title: string; subtitle: string }> = {
    "PRSummary": { title: "PR Summary", subtitle: "Pull Request Details" },
    "CommitTimeline": { title: "Commit Timeline", subtitle: "Commit History" },
    "RiskHeatmap": { title: "Risk Heatmap", subtitle: "Code Quality Analysis" },
    "FileViewer": { title: "File Viewer", subtitle: "File Contents" },
};

/**
 * Gets a human-readable component type name by checking the React element type
 */
function getBaseComponentInfo(component: React.ReactNode): { title: string; subtitle: string } {
    if (!React.isValidElement(component)) {
        return { title: "Component", subtitle: "Interactive Component" };
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
    if (lowerTypeName.includes("pr") || lowerTypeName.includes("pull")) {
        return { title: "PR Summary", subtitle: "Pull Request Details" };
    }
    if (lowerTypeName.includes("commit") || lowerTypeName.includes("timeline")) {
        return { title: "Commit Timeline", subtitle: "Commit History" };
    }
    if (lowerTypeName.includes("risk") || lowerTypeName.includes("heatmap")) {
        return { title: "Risk Heatmap", subtitle: "Code Quality Analysis" };
    }
    if (lowerTypeName.includes("file")) {
        return { title: "File Viewer", subtitle: "File Contents" };
    }

    return { title: typeName || "Component", subtitle: "Interactive Component" };
}

interface ComponentInfo {
    messageId: string;
    title: string;
    subtitle: string;
    component: React.ReactNode;
}

interface ComponentRegistryContextType {
    components: ComponentInfo[];
    getComponentInfo: (messageId: string) => ComponentInfo | undefined;
}

const ComponentRegistryContext = React.createContext<ComponentRegistryContextType | null>(null);

/**
 * Provider that tracks all rendered components and assigns numbered names
 */
export function ComponentRegistryProvider({ children }: { children: React.ReactNode }) {
    const { thread } = useTambo();

    const components = React.useMemo<ComponentInfo[]>(() => {
        if (!thread?.messages) return [];

        // First pass: get all components with their base info
        const componentsList = thread.messages
            .filter((m: TamboThreadMessage) => m.role === "assistant" && m.renderedComponent && !m.isCancelled)
            .map((m: TamboThreadMessage) => {
                const baseInfo = getBaseComponentInfo(m.renderedComponent);
                return {
                    messageId: m.id,
                    baseTitle: baseInfo.title,
                    subtitle: baseInfo.subtitle,
                    component: m.renderedComponent,
                };
            });

        // Count occurrences of each component type
        const typeCounts: Record<string, number> = {};
        const typeInstanceCounts: Record<string, number> = {};

        // First, count total of each type
        componentsList.forEach(c => {
            typeCounts[c.baseTitle] = (typeCounts[c.baseTitle] || 0) + 1;
        });

        // Second pass: assign numbered names
        return componentsList.map((c) => {
            typeInstanceCounts[c.baseTitle] = (typeInstanceCounts[c.baseTitle] || 0) + 1;
            const instanceNumber = typeInstanceCounts[c.baseTitle];
            const totalOfType = typeCounts[c.baseTitle];

            // Only add number if there are multiple of the same type
            const title = totalOfType > 1
                ? `${c.baseTitle} #${instanceNumber}`
                : c.baseTitle;

            return {
                messageId: c.messageId,
                title,
                subtitle: c.subtitle,
                component: c.component,
            };
        });
    }, [thread?.messages]);

    const getComponentInfo = React.useCallback((messageId: string) => {
        return components.find(c => c.messageId === messageId);
    }, [components]);

    return (
        <ComponentRegistryContext.Provider value={{ components, getComponentInfo }}>
            {children}
        </ComponentRegistryContext.Provider>
    );
}

/**
 * Hook to access the component registry
 */
export function useComponentRegistry() {
    const context = React.useContext(ComponentRegistryContext);
    if (!context) {
        throw new Error("useComponentRegistry must be used within a ComponentRegistryProvider");
    }
    return context;
}

/**
 * Hook to get component info for a specific message (safe version that returns null if no provider)
 */
export function useComponentInfo(messageId: string): ComponentInfo | null {
    const context = React.useContext(ComponentRegistryContext);
    if (!context) return null;
    return context.getComponentInfo(messageId) || null;
}
