"use client";

import { GenerationStage, useTambo } from "@tambo-ai/react";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useCallback, useEffect, useRef, useMemo } from "react";

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

  // Handle forwarded ref
  React.useImperativeHandle(ref, () => scrollContainerRef.current!, []);

  // Create a dependency that represents all content that should trigger autoscroll
  const messagesContent = useMemo(() => {
    if (!thread.messages) return null;

    return thread.messages.map((message) => ({
      id: message.id,
      role: message.role,
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

  // Track if we should auto-scroll
  // precise control using refs to avoid closure stale state
  const shouldAutoscrollRef = useRef(true);

  // Handle scroll events to detect user scrolling
  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;

    // Standard "sticky" logic: if we are close to bottom (within 50px), enable auto-scroll.
    // Otherwise, the user has scrolled up, so disable it.
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom < 50;

    shouldAutoscrollRef.current = isAtBottom;
  }, []);

  // Auto-scroll logic
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !messagesContent) return;

    const lastMessage = messagesContent[messagesContent.length - 1];
    const isUserMessage = lastMessage?.role === 'user'; /* user */

    // We force auto-scroll if:
    // 1. We are already in "sticky" mode (was at bottom)
    // 2. OR the last message is from the user (they just sent it, so they want to see it)
    if (shouldAutoscrollRef.current || isUserMessage) {
      // If we force scroll due to user message, re-enable sticky mode
      if (isUserMessage) {
        shouldAutoscrollRef.current = true;
      }

      const scroll = () => {
        if (scrollContainer) {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: generationStage === GenerationStage.STREAMING_RESPONSE ? "auto" : "smooth",
          });
        }
      };

      // Use requestAnimationFrame for immediate updates during streaming
      // setTimeout for other updates to allow layout to settle
      if (generationStage === GenerationStage.STREAMING_RESPONSE) {
        requestAnimationFrame(scroll);
      } else {
        // slightly larger delay to ensure DOM is ready (e.g. images/components)
        setTimeout(scroll, 100);
      }
    }
  }, [messagesContent, generationStage]);

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
