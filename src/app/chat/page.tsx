"use client";

import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { components, tools } from "@/lib/tambo";
import { TamboProvider } from "@tambo-ai/react";
import { useState, useEffect } from "react";
import { Github, GitBranch, AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface AuthStatus {
  authenticated: boolean;
  user: { login: string; avatar_url: string; name: string | null } | null;
  accessToken: string | null;
}

export default function Home() {
  const mcpServers = useMcpServers();
  const searchParams = useSearchParams();

  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    authenticated: false,
    user: null,
    accessToken: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Handle OAuth errors/success from URL params
      const urlError = searchParams.get("error");
      if (urlError) {
        setError(urlError);
        window.history.replaceState({}, "", "/chat");
      }

      if (searchParams.get("auth") === "success") {
        window.history.replaceState({}, "", "/chat");
      }

      // Check if user is logged in
      try {
        const response = await fetch("/api/auth/status");
        const data = await response.json();
        setAuthStatus(data);

        // Store token so MCP hook can use it
        if (data.authenticated && data.accessToken) {
          localStorage.setItem(
            "gitstory-auth",
            JSON.stringify({ accessToken: data.accessToken })
          );

          window.dispatchEvent(
            new CustomEvent("gitstory-auth-changed", {
              detail: { isAuthenticated: true, user: data.user },
            })
          );
        }
      } catch (e) {
        console.error("Auth check failed:", e);
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [searchParams]);

  const handleGitHubConnect = () => {
    window.location.href = "/api/auth/github";
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/auth/status", { method: "DELETE" });
      setAuthStatus({ authenticated: false, user: null, accessToken: null });
      localStorage.removeItem("gitstory-auth");
      localStorage.removeItem("gitstory-repo");

      window.dispatchEvent(
        new CustomEvent("gitstory-auth-changed", {
          detail: { isAuthenticated: false },
        })
      );
    } catch (e) {
      console.error("Failed to disconnect:", e);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in - show connect button
  if (!authStatus.authenticated) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <GitBranch className="w-10 h-10 text-primary" />
            <h1 className="text-3xl font-bold">GitStory</h1>
          </div>

          <p className="text-muted-foreground mb-8">
            Connect your GitHub account to explore repository history with AI-powered insights.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 text-destructive">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleGitHubConnect}
            className="inline-flex items-center gap-3 px-6 py-3 bg-[#24292e] hover:bg-[#2f363d] text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            <Github className="w-5 h-5" />
            Connect with GitHub
          </button>

          <p className="mt-6 text-xs text-muted-foreground">
            We'll request read access to your repositories to analyze Git history.
          </p>
        </div>
      </div>
    );
  }

  // Logged in - show chat
  return (
    <TamboProvider
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
      components={components}
      tools={tools}
      tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL}
      mcpServers={mcpServers}
    >
      <div className="h-screen flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            <span className="font-semibold">GitStory</span>
          </div>

          <div className="flex items-center gap-3">
            {authStatus.user && (
              <div className="flex items-center gap-2">
                <img
                  src={authStatus.user.avatar_url}
                  alt={authStatus.user.login}
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-sm text-muted-foreground">
                  {authStatus.user.login}
                </span>
              </div>
            )}
            <button
              onClick={handleDisconnect}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <MessageThreadFull className="max-w-4xl mx-auto h-full" />
        </div>
      </div>
    </TamboProvider>
  );
}
