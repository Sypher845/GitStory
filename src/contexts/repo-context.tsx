"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface ParsedRepo {
    owner: string;
    repo: string;
    branch?: string;
}

interface GitHubAuthState {
    accessToken: string | null;
    isAuthenticated: boolean;
    user: {
        login: string;
        avatar_url: string;
        name: string | null;
    } | null;
}

interface RepoContextValue {
    owner: string | null;
    repo: string | null;
    branch: string;
    fullName: string | null;
    isConnected: boolean;
    isConnecting: boolean;
    connectionError: string | null;
    auth: GitHubAuthState;
    setRepo: (owner: string, repo: string, branch?: string) => void;
    parseAndSetRepo: (url: string) => ParsedRepo | null;
    disconnect: () => void;
    setAuth: (token: string) => Promise<void>;
    clearAuth: () => void;
}

const RepoContext = createContext<RepoContextValue | null>(null);

// Parse various GitHub URL formats
export function parseGitHubUrl(input: string): ParsedRepo | null {
    if (!input || typeof input !== "string") return null;

    const trimmed = input.trim();

    // SSH: git@github.com:owner/repo.git
    const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(\.git)?$/);
    if (sshMatch) {
        return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    // HTTPS: https://github.com/owner/repo
    const httpsMatch = trimmed.match(
        /^(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/tree\/([^/]+))?(?:\/.*)?$/
    );
    if (httpsMatch) {
        return { owner: httpsMatch[1], repo: httpsMatch[2], branch: httpsMatch[3] };
    }

    // Shorthand: owner/repo
    const shorthandMatch = trimmed.match(/^([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (shorthandMatch) {
        return { owner: shorthandMatch[1], repo: shorthandMatch[2] };
    }

    return null;
}

const STORAGE_KEYS = {
    REPO: "gitstory-repo",
    AUTH: "gitstory-auth",
} as const;

export function RepoProvider({ children }: { children: React.ReactNode }) {
    const [owner, setOwner] = useState<string | null>(null);
    const [repo, setRepoState] = useState<string | null>(null);
    const [branch, setBranch] = useState<string>("main");
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [auth, setAuthState] = useState<GitHubAuthState>({
        accessToken: null,
        isAuthenticated: false,
        user: null,
    });

    const isConnected = !!owner && !!repo && auth.isAuthenticated;
    const fullName = owner && repo ? `${owner}/${repo}` : null;

    // Load saved state
    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            const savedRepo = localStorage.getItem(STORAGE_KEYS.REPO);
            if (savedRepo) {
                const parsed = JSON.parse(savedRepo);
                if (parsed.owner && parsed.repo) {
                    setOwner(parsed.owner);
                    setRepoState(parsed.repo);
                    setBranch(parsed.branch || "main");
                }
            }
        } catch {
            // ignore
        }

        try {
            const savedAuth = localStorage.getItem(STORAGE_KEYS.AUTH);
            if (savedAuth) {
                const parsed = JSON.parse(savedAuth);
                if (parsed.accessToken) {
                    validateAndSetAuth(parsed.accessToken);
                }
            }
        } catch {
            // ignore
        }
    }, []);

    // Save repo changes
    useEffect(() => {
        if (typeof window === "undefined" || !owner || !repo) return;

        localStorage.setItem(STORAGE_KEYS.REPO, JSON.stringify({ owner, repo, branch }));

        window.dispatchEvent(
            new CustomEvent("gitstory-repo-changed", { detail: { owner, repo, branch } })
        );
    }, [owner, repo, branch]);

    const validateAndSetAuth = useCallback(async (token: string) => {
        setIsConnecting(true);
        setConnectionError(null);

        try {
            const response = await fetch("https://api.github.com/user", {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/vnd.github.v3+json",
                },
            });

            if (!response.ok) throw new Error("Invalid or expired token");

            const user = await response.json();

            const newAuth: GitHubAuthState = {
                accessToken: token,
                isAuthenticated: true,
                user: { login: user.login, avatar_url: user.avatar_url, name: user.name },
            };

            setAuthState(newAuth);
            localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ accessToken: token }));

            window.dispatchEvent(
                new CustomEvent("gitstory-auth-changed", {
                    detail: { isAuthenticated: true, user: newAuth.user },
                })
            );
        } catch (error) {
            setConnectionError(error instanceof Error ? error.message : "Auth failed");
            setAuthState({ accessToken: null, isAuthenticated: false, user: null });
            localStorage.removeItem(STORAGE_KEYS.AUTH);
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const setRepoAction = useCallback((newOwner: string, newRepo: string, newBranch?: string) => {
        setOwner(newOwner);
        setRepoState(newRepo);
        if (newBranch) setBranch(newBranch);
    }, []);

    const parseAndSetRepo = useCallback((url: string) => {
        const parsed = parseGitHubUrl(url);
        if (parsed) {
            setRepoAction(parsed.owner, parsed.repo, parsed.branch);
        }
        return parsed;
    }, [setRepoAction]);

    const disconnect = useCallback(() => {
        setOwner(null);
        setRepoState(null);
        setBranch("main");
        localStorage.removeItem(STORAGE_KEYS.REPO);
        window.dispatchEvent(new CustomEvent("gitstory-repo-changed", { detail: null }));
    }, []);

    const clearAuth = useCallback(() => {
        setAuthState({ accessToken: null, isAuthenticated: false, user: null });
        localStorage.removeItem(STORAGE_KEYS.AUTH);
        window.dispatchEvent(
            new CustomEvent("gitstory-auth-changed", { detail: { isAuthenticated: false, user: null } })
        );
    }, []);

    const value: RepoContextValue = {
        owner,
        repo,
        branch,
        fullName,
        isConnected,
        isConnecting,
        connectionError,
        auth,
        setRepo: setRepoAction,
        parseAndSetRepo,
        disconnect,
        setAuth: validateAndSetAuth,
        clearAuth,
    };

    return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>;
}

export function useRepo() {
    const context = useContext(RepoContext);
    if (!context) {
        throw new Error("useRepo must be used within a RepoProvider");
    }
    return context;
}

export { RepoContext };
