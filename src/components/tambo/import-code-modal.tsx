"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import * as React from "react";

export interface ImportCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Parse GitHub URL to extract owner, repo, and optional branch
function parseGitHubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
    try {
        const cleanUrl = url.trim().replace(/\/+$/, "");
        const urlWithProtocol = cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`;

        const parsed = new URL(urlWithProtocol);

        if (!parsed.hostname.includes("github.com")) {
            return null;
        }

        const pathParts = parsed.pathname.split("/").filter(Boolean);

        if (pathParts.length < 2) {
            return null;
        }

        const owner = pathParts[0];
        const repo = pathParts[1].replace(/\.git$/, "");

        // Check for branch in /tree/branch format
        let branch: string | undefined;
        if (pathParts[2] === "tree" && pathParts[3]) {
            branch = pathParts.slice(3).join("/");
        }

        return { owner, repo, branch };
    } catch {
        return null;
    }
}

export const ImportCodeModal: React.FC<ImportCodeModalProps> = ({
    isOpen,
    onClose,
}) => {
    const [url, setUrl] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const [isImporting, setIsImporting] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Focus input when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setUrl("");
            setError(null);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Handle escape key
    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isOpen, onClose]);

    const handleImport = async () => {
        setError(null);

        if (!url.trim()) {
            setError("Please enter a GitHub repository URL");
            return;
        }

        const parsed = parseGitHubUrl(url);

        if (!parsed) {
            setError("Invalid GitHub URL. Please use format: https://github.com/owner/repo");
            return;
        }

        setIsImporting(true);

        try {
            // Save to localStorage
            const repoData = {
                owner: parsed.owner,
                repo: parsed.repo,
                branch: parsed.branch || null,
            };

            localStorage.setItem("gitstory-repo", JSON.stringify(repoData));

            // Dispatch event to notify the MCP hook
            window.dispatchEvent(
                new CustomEvent("gitstory-repo-changed", {
                    detail: { owner: parsed.owner, repo: parsed.repo },
                })
            );

            // Dispatch event to start a new thread (clears old conversation context)
            window.dispatchEvent(
                new CustomEvent("gitstory-start-new-thread")
            );

            onClose();
        } catch (err) {
            console.error("Failed to import repository:", err);
            setError("Failed to import repository. Please try again.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !isImporting) {
            handleImport();
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <div
                className={cn(
                    "relative z-10 w-full max-w-lg mx-4",
                    "bg-card border border-border rounded-xl shadow-2xl",
                    "animate-in fade-in-0 zoom-in-95 duration-200"
                )}
                role="dialog"
                aria-modal="true"
                aria-labelledby="import-code-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4">
                    <h2
                        id="import-code-title"
                        className="text-xl font-semibold text-foreground"
                    >
                        Import code
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 space-y-4">
                    {/* Input field with floating label style */}
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            id="github-url"
                            value={url}
                            onChange={(e) => {
                                setUrl(e.target.value);
                                setError(null);
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="e.g. https://github.com/user/repo"
                            className={cn(
                                "w-full px-4 py-3 pr-24",
                                "bg-background border rounded-lg",
                                "text-foreground placeholder:text-muted-foreground/60",
                                "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
                                "transition-colors",
                                error ? "border-destructive" : "border-border"
                            )}
                        />
                        <label
                            htmlFor="github-url"
                            className="absolute -top-2.5 left-3 px-1 bg-card text-xs text-muted-foreground"
                        >
                            GitHub repository or branch URL
                        </label>
                        <button
                            type="button"
                            onClick={handleImport}
                            disabled={isImporting || !url.trim()}
                            className={cn(
                                "absolute right-2 top-1/2 -translate-y-1/2",
                                "px-4 py-1.5 rounded-md text-sm font-medium",
                                "bg-primary/10 text-primary hover:bg-primary/20",
                                "disabled:opacity-50 disabled:cursor-not-allowed",
                                "transition-colors"
                            )}
                        >
                            {isImporting ? "..." : "Import"}
                        </button>
                    </div>

                    {/* Error message */}
                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    {/* Upload folder link placeholder */}
                    <button
                        type="button"
                        className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                        onClick={() => {
                            // Placeholder for future upload folder functionality
                            alert("Upload folder functionality coming soon!");
                        }}
                    >
                        Upload folder
                    </button>
                </div>
            </div>
        </div>
    );
};

ImportCodeModal.displayName = "ImportCodeModal";

export default ImportCodeModal;
