"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ArrowRight, Loader2 } from "lucide-react";

/**
 * SplitActionButton — an action button whose trailing icon sits in its own
 * cell, divided from the label by a hairline rule.
 *
 * The divider is the whole point: it reads as a control with two parts
 * (do the thing / where it leads) rather than as decoration. Squared off
 * and flat, so it belongs to the same family as inputs and table rows.
 *
 * Pass `href` to render as an anchor, or omit to render as a button.
 */

const splitButtonVariants = cva(
  "group inline-flex items-stretch overflow-hidden whitespace-nowrap rounded-md text-sm font-medium tracking-tight transition-colors disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border border-border-strong bg-transparent text-foreground hover:bg-accent",
        accent:
          "bg-foreground text-background hover:bg-foreground/90",
        subtle:
          "bg-secondary text-secondary-foreground hover:bg-accent",
      },
      size: {
        default: "h-9 text-[13px]",
        sm: "h-8 text-xs",
        lg: "h-10 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/** Label cell padding — kept separate so the divider can span full height. */
const labelVariants = cva("flex flex-1 items-center justify-center", {
  variants: {
    size: {
      default: "px-3.5",
      sm: "px-3",
      lg: "px-4",
    },
  },
  defaultVariants: { size: "default" },
});

/**
 * The divider colour is derived from the label colour rather than hardcoded,
 * so each variant gets a rule that reads at the same weight against its own
 * background.
 */
const iconCellVariants = cva(
  "flex items-center justify-center border-l transition-transform",
  {
    variants: {
      variant: {
        default: "border-primary-foreground/25",
        outline: "border-border-strong",
        accent: "border-background/25",
        subtle: "border-border-strong",
      },
      size: {
        default: "w-9",
        sm: "w-8",
        lg: "w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface SplitActionButtonProps
  extends Omit<React.ComponentProps<"button">, "color">,
    VariantProps<typeof splitButtonVariants> {
  /** When provided, renders as an <a> with this href. */
  href?: string;
  /** Anchor target (only used when href is set). */
  target?: string;
  /** Anchor rel (only used when href is set). */
  rel?: string;
  /** Click handler (used for both button and anchor). */
  onClick?: React.MouseEventHandler<HTMLElement>;
  /** Icon to show in the trailing cell. Defaults to ArrowRight. */
  icon?: React.ReactNode;
  /** When true, shows a spinner instead of the icon. */
  loading?: boolean;
}

function SplitActionButton({
  className,
  variant,
  size,
  href,
  target,
  rel,
  onClick,
  icon,
  loading = false,
  children,
  ...props
}: SplitActionButtonProps) {
  const inner = (
    <>
      <span className={cn(labelVariants({ size }))}>{children}</span>
      <span
        className={cn(iconCellVariants({ variant, size }))}
        aria-hidden="true"
      >
        <span className="flex transition-transform group-hover:translate-x-px [&_svg]:size-3.5">
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            icon ?? <ArrowRight className="h-3.5 w-3.5" />
          )}
        </span>
      </span>
    </>
  );

  const className_ = cn(splitButtonVariants({ variant, size, className }));

  if (href) {
    return (
      <a
        data-slot="split-button"
        href={href}
        target={target}
        rel={rel}
        onClick={onClick}
        className={className_}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      data-slot="split-button"
      onClick={onClick}
      className={className_}
      {...props}
    >
      {inner}
    </button>
  );
}

export { SplitActionButton, splitButtonVariants };
