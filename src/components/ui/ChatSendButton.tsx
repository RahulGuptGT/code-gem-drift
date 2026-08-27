import * as React from 'react';
import { ArrowUp, Square } from "lucide-react";import { cn } from '@/lib/utils';
import { UniversalSpinner } from "@/components/ui/UniversalLoader";

interface ChatSendButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  state?: 'idle' | 'sending' | 'loading';
  onStop?: () => void;
}

/**
 * Minimal Notion/ChatGPT-style send button:
 * - circular, light surface, subtle border, muted up-arrow
 * - turns into a Stop button while sending
 */
export const ChatSendButton = React.forwardRef<HTMLButtonElement, ChatSendButtonProps>(
  ({ state = 'idle', onStop, className, disabled, onClick, ...rest }, ref) => {
    if (state === 'sending') {
      return (
        <button
          ref={ref}
          type="button"
          onClick={onStop}
          aria-label="Stop"
          title="Stop"
          className={cn(
            'h-8 w-8 inline-flex items-center justify-center rounded-full',
            'border border-border bg-foreground text-background',
            'hover:opacity-90 active:scale-95 transition-all',
            className,
          )}
        >
          <Square className="h-3 w-3 fill-current" />
        </button>
      );
    }

    const isLoading = state === 'loading';
    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        aria-label="Send"
        title="Send"
        className={cn(
          'h-8 w-8 inline-flex items-center justify-center rounded-full shrink-0',
          'border border-border bg-background text-muted-foreground',
          'transition-all duration-150',
          'hover:bg-muted hover:text-foreground hover:border-foreground/30',
          'enabled:not-disabled:[&]:data-[active=true]:bg-foreground enabled:not-disabled:[&]:data-[active=true]:text-background',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          !disabled && 'data-[active=true]:bg-foreground data-[active=true]:text-background data-[active=true]:border-foreground',
          className,
        )}
        data-active={!disabled}
        {...rest}
      >
        {isLoading ? <UniversalSpinner size={14} /> : <ArrowUp className="h-4 w-4" strokeWidth={2.25} />}
      </button>
    );
  },
);
ChatSendButton.displayName = 'ChatSendButton';
