"use client";

import type { messageVariants } from "@/components/tambo/message";
import {
  MessageInput,
  MessageInputError,
  MessageInputFileButton,
  MessageInputImportCodeButton,
  MessageInputSubmitButton,
  MessageInputTextarea,
  MessageInputToolbar,
} from "@/components/tambo/message-input";
import {
  MessageSuggestions,
  MessageSuggestionsList,
  MessageSuggestionsStatus,
} from "@/components/tambo/message-suggestions";
import { ScrollableMessageContainer } from "@/components/tambo/scrollable-message-container";
import { RepoContextBadge } from "@/components/tambo/repo-context-badge";
import { ThreadContainer, useThreadContainerContext } from "./thread-container";
import {
  ThreadContent,
  ThreadContentMessages,
} from "@/components/tambo/thread-content";
import {
  ThreadHistory,
  ThreadHistoryHeader,
  ThreadHistoryList,
  ThreadHistoryNewButton,
  ThreadHistorySearch,
} from "@/components/tambo/thread-history";
import { useMergeRefs } from "@/lib/thread-hooks";
import type { Suggestion } from "@tambo-ai/react";
import { useTamboThread, useTamboThreadInput, useTamboThreadList } from "@tambo-ai/react";
import type { VariantProps } from "class-variance-authority";
import { useSearchParams, useRouter } from "next/navigation";
import * as React from "react";

/**
 * Props for the MessageThreadFull component
 */
export interface MessageThreadFullProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Controls the visual styling of messages in the thread.
   * Possible values include: "default", "compact", etc.
   * These values are defined in messageVariants from "@/components/tambo/message".
   * @example variant="compact"
   */
  variant?: VariantProps<typeof messageVariants>["variant"];
}

/**
 * A full-screen chat thread component with message history, input, and suggestions
 */
export const MessageThreadFull = React.forwardRef<
  HTMLDivElement,
  MessageThreadFullProps
>(({
  className, variant, ...props }, ref) => {
  const { containerRef, historyPosition } = useThreadContainerContext();
  const mergedRef = useMergeRefs<HTMLDivElement | null>(ref, containerRef);
  const { startNewThread, thread, switchCurrentThread } = useTamboThread();
  const { setValue, submit, value } = useTamboThreadInput();
  const { data: threads } = useTamboThreadList();

  // URL routing
  const searchParams = useSearchParams();
  const router = useRouter();
  const threadIdFromUrl = searchParams.get("thread");
  const hasInitializedFromUrl = React.useRef(false);
  const previousThreadId = React.useRef<string | null>(null);

  // Clear repo context when switching threads (so import code badge doesn't persist)
  React.useEffect(() => {
    if (!thread?.id) return;

    // If this is a thread switch (not initial load)
    if (previousThreadId.current && previousThreadId.current !== thread.id) {
      // Clear the repo context
      localStorage.removeItem("gitstory-repo");
      window.dispatchEvent(
        new CustomEvent("gitstory-repo-changed", {
          detail: null,
        })
      );
    }

    previousThreadId.current = thread.id;
  }, [thread?.id]);

  // On mount: load thread from URL if specified
  React.useEffect(() => {
    if (hasInitializedFromUrl.current) return;
    if (!threadIdFromUrl || !threads?.items?.length) return;

    // Check if the thread exists
    const threadExists = threads.items.some(t => t.id === threadIdFromUrl);
    if (threadExists && thread?.id !== threadIdFromUrl) {
      switchCurrentThread(threadIdFromUrl);
    }
    hasInitializedFromUrl.current = true;
  }, [threadIdFromUrl, threads?.items, thread?.id, switchCurrentThread]);

  // Update URL when thread changes
  React.useEffect(() => {
    if (!thread?.id) return;

    const currentThreadParam = searchParams.get("thread");
    if (currentThreadParam !== thread.id) {
      // Update URL without full navigation
      const newUrl = `/chat?thread=${thread.id}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [thread?.id, searchParams, router]);

  // Get repo context from localStorage
  const getRepoContext = React.useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem("gitstory-repo");
      if (saved) {
        const { owner, repo, branch } = JSON.parse(saved);
        const url = `https://github.com/${owner}/${repo}${branch ? `/tree/${branch}` : ''}`;
        return `\n\n[Repository Context: ${url}]`;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  // Listen for repo change events to start a new thread (clears old context)
  React.useEffect(() => {
    const handleStartNewThread = () => {
      startNewThread();
    };

    window.addEventListener("gitstory-start-new-thread", handleStartNewThread);
    return () => {
      window.removeEventListener("gitstory-start-new-thread", handleStartNewThread);
    };
  }, [startNewThread]);

  // Listen for import code message events to send a hidden exploration message
  React.useEffect(() => {
    const handleImportCodeMessage = async (event: CustomEvent<{ repoUrl: string }>) => {
      const { repoUrl } = event.detail;
      // Add hidden tag to the message so it can be filtered from UI
      const hiddenMessage = `<!-- HIDDEN:import-code-initialization -->I want to explore this GitHub repository: ${repoUrl}`;

      // Wait a bit for the new thread to be ready
      await new Promise(resolve => setTimeout(resolve, 200));

      // Set the value and submit
      setValue(hiddenMessage);
      await new Promise(resolve => setTimeout(resolve, 50));
      await submit({ streamResponse: true, resourceNames: {} });
    };

    window.addEventListener("gitstory-import-code-message", handleImportCodeMessage as unknown as EventListener);
    return () => {
      window.removeEventListener("gitstory-import-code-message", handleImportCodeMessage as unknown as EventListener);
    };
  }, [setValue, submit]);

  // Custom submit wrapper that appends repo context invisibly
  const submitWithRepoContext = React.useCallback(async (
    options: { streamResponse?: boolean; resourceNames: Record<string, string> }
  ) => {
    const repoContext = getRepoContext();
    if (repoContext && value) {
      // Temporarily add repo context to the message
      const originalValue = value;
      setValue(originalValue + repoContext);

      // Wait a tick for the value to be set
      await new Promise(resolve => setTimeout(resolve, 50));

      try {
        await submit(options);
      } finally {
        // The value is cleared after submit anyway
      }
    } else {
      await submit(options);
    }
  }, [getRepoContext, value, setValue, submit]);

  const threadHistorySidebar = (
    <ThreadHistory position={historyPosition}>
      <ThreadHistoryHeader />
      <ThreadHistoryNewButton />
      <ThreadHistorySearch />
      <ThreadHistoryList />
    </ThreadHistory>
  );

  const defaultSuggestions: Suggestion[] = [
    {
      id: "suggestion-1",
      title: "Get started",
      detailedSuggestion: "What can you help me with?",
      messageId: "welcome-query",
    },
    {
      id: "suggestion-2",
      title: "Learn more",
      detailedSuggestion: "Tell me about your capabilities.",
      messageId: "capabilities-query",
    },
    {
      id: "suggestion-3",
      title: "Examples",
      detailedSuggestion: "Show me some example queries I can try.",
      messageId: "examples-query",
    },
  ];

  // Check if thread has any messages (to determine layout)
  const hasMessages = thread?.messages && thread.messages.length > 0;

  return (
    <div className="flex h-full w-full">
      {/* Thread History Sidebar - rendered first if history is on the left */}
      {historyPosition === "left" && threadHistorySidebar}

      <ThreadContainer
        ref={mergedRef}
        disableSidebarSpacing
        className={className}
        {...props}
      >
        {hasMessages ? (
          // Normal conversation layout - messages at top, input at bottom
          <>
            <ScrollableMessageContainer className="p-4">
              <ThreadContent variant={variant}>
                <ThreadContentMessages />
              </ThreadContent>
            </ScrollableMessageContainer>

            {/* Message suggestions status */}
            <MessageSuggestions>
              <MessageSuggestionsStatus />
            </MessageSuggestions>

            {/* Message input */}
            <div className="px-4 pb-4">
              {/* Show connected repo badge */}
              <div className="mb-2">
                <RepoContextBadge />
              </div>
              <MessageInput>
                <MessageInputTextarea placeholder="Type your message or paste images..." />
                <MessageInputToolbar>
                  <MessageInputFileButton />
                  <MessageInputImportCodeButton />
                  <MessageInputSubmitButton />
                </MessageInputToolbar>
                <MessageInputError />
              </MessageInput>
            </div>

            {/* Message suggestions */}
            <MessageSuggestions initialSuggestions={defaultSuggestions}>
              <MessageSuggestionsList />
            </MessageSuggestions>
          </>
        ) : (
          // Empty state - centered welcome layout (like Gemini/Claude)
          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
            {/* Welcome title */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-medium text-foreground mb-2">
                Where should we start?
              </h1>
              <p className="text-muted-foreground">
                Ask me about GitHub repositories, commits, or any code questions
              </p>
            </div>

            {/* Centered message input - wider container */}
            <div className="w-full max-w-4xl">
              {/* Show connected repo badge */}
              <div className="mb-2">
                <RepoContextBadge />
              </div>
              <MessageInput>
                <MessageInputTextarea placeholder="Type your message or paste images..." />
                <MessageInputToolbar>
                  <MessageInputFileButton />
                  <MessageInputImportCodeButton />
                  <MessageInputSubmitButton />
                </MessageInputToolbar>
                <MessageInputError />
              </MessageInput>
            </div>

            {/* Message suggestions below the input */}
            <div className="w-full max-w-4xl mt-4">
              <MessageSuggestions initialSuggestions={defaultSuggestions}>
                <MessageSuggestionsList />
              </MessageSuggestions>
            </div>
          </div>
        )}
      </ThreadContainer>

      {/* Thread History Sidebar - rendered last if history is on the right */}
      {historyPosition === "right" && threadHistorySidebar}
    </div>
  );
});
MessageThreadFull.displayName = "MessageThreadFull";
