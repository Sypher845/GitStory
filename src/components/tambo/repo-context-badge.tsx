"use client";

import { cn } from "@/lib/utils";
import { useGitHubRepoInfo } from "@/hooks/use-github-mcp";
import { Github, X } from "lucide-react";
import * as React from "react";

// Shows the connected GitHub repo with a remove button
export const RepoContextBadge: React.FC<{
    className?: string;
}> = ({ className }) => {
    const repoInfo = useGitHubRepoInfo();
    const [isVisible, setIsVisible] = React.useState(true);

    // Reset visibility when repo changes
    React.useEffect(() => {
        if (repoInfo.fullName) {
            setIsVisible(true);
        }
    }, [repoInfo.fullName]);

    const handleRemove = () => {
        localStorage.removeItem("gitstory-repo");
        window.dispatchEvent(
            new CustomEvent("gitstory-repo-changed", {
                detail: null,
            })
        );

        setIsVisible(false);
    };

    if (!repoInfo.fullName || !isVisible) {
        return null;
    }

    // Truncate long repo names
    const displayName = repoInfo.fullName.length > 25
        ? repoInfo.fullName.slice(0, 22) + "..."
        : repoInfo.fullName;

    return (
        <div
            className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5",
                "bg-card border border-border rounded-lg",
                "text-sm text-foreground",
                "shadow-sm",
                className
            )}
        >
            <div className="flex flex-col">
                <span className="font-medium truncate max-w-[180px]" title={repoInfo.fullName}>
                    {displayName}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Github className="w-3 h-3" />
                    GitHub
                </span>
            </div>
            <button
                type="button"
                onClick={handleRemove}
                className="ml-1 p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                aria-label="Remove repository"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

RepoContextBadge.displayName = "RepoContextBadge";

export default RepoContextBadge;
