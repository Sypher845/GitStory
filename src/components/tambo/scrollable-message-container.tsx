"use client";

import { GenerationStage, useTambo } from "@tambo-ai/react";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";

/**
 * Props for the ScrollableMessageContainer component
 */
export type ScrollableMessageContainerProps =
  React.HTMLAttributes<HTMLDivElement>;

/**
 * A scrollable container for message content with auto-scroll functionality.
 * Used across message thread components for consistent scrolling behavior.
 *
 * @example
 * ```tsx
 * <ScrollableMessageContainer>
 *   <ThreadContent variant="default">
 *     <ThreadContentMessages />
 *   </ThreadContent>
 * </ScrollableMessageContainer>
 * ```
 */
export const ScrollableMessageContainer = React.forwardRef<
  HTMLDivElement,
  ScrollableMessageContainerProps
>(({ className, children, ...props }, ref) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { thread } = useTambo();
  const [shouldAutoscroll, setShouldAutoscroll] = useState(true);
  const lastScrollTopRef = useRef(0);

  // Handle forwarded ref
  React.useImperativeHandle(ref, () => scrollContainerRef.current!, []);

  // Create a dependency that represents all content that should trigger autoscroll
  const messagesContent = useMemo(() => {
    if (!thread.messages) return null;

    return thread.messages.map((message) => ({
      id: message.id,
      content: message.content,
      tool_calls: message.tool_calls,
      component: message.component,
      reasoning: message.reasoning,
      componentState: message.componentState,
    }));
  }, [thread.messages]);

  const generationStage = useMemo(
    () => thread?.generationStage ?? GenerationStage.IDLE,
    [thread?.generationStage],
  );

  // Use a ref for immediate access to the latest scroll state
  // This prevents the "fighting" behavior where a render update might use stale state
  const shouldAutoscrollRef = useRef(shouldAutoscroll);

  // Sync ref with state
  useEffect(() => {
    shouldAutoscrollRef.current = shouldAutoscroll;
  }, [shouldAutoscroll]);

  // Handle scroll events to detect user scrolling
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;

    // Check if user is at the bottom (with tolerance)
    const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;

    // IMPORTANT: Check scroll direction relative to the last known position
    // If scrollTop DECREASED, the user is scrolling UP.
    if (scrollTop < lastScrollTopRef.current) {
      // User scrolled up - disable autoscroll immediately
      setShouldAutoscroll(false);
      shouldAutoscrollRef.current = false;
    }
    // If user is at bottom, enable autoscroll
    else if (isAtBottom) {
      setShouldAutoscroll(true);
      shouldAutoscrollRef.current = true;
    }

    lastScrollTopRef.current = scrollTop;
  }, []);

  // Auto-scroll to bottom when message content changes
  useEffect(() => {
    // Only scroll if the REF says we should (immediate check)
    if (scrollContainerRef.current && messagesContent && shouldAutoscrollRef.current) {
      const scroll = () => {
        // Double check ref inside the callback in case it changed since schedule
        if (scrollContainerRef.current && shouldAutoscrollRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      };

      if (generationStage === GenerationStage.STREAMING_RESPONSE) {
        // During streaming, scroll immediately
        requestAnimationFrame(scroll);
      } else {
        // For other updates, use a short delay to batch rapid changes
        const timeoutId = setTimeout(scroll, 50);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [messagesContent, generationStage]); // Removed shouldAutoscroll from dependency as we use ref, but logically the effect runs on content change mostly

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={cn(
        "flex-1 overflow-y-auto chat-scrollbar",
        className,
      )}
      data-slot="scrollable-message-container"
      {...props}
    >
      {children}
    </div>
  );
});
ScrollableMessageContainer.displayName = "ScrollableMessageContainer";
