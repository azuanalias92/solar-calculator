"use client";

import { useRef, type KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
};

type Props<T extends string> = {
  value: T | undefined;
  options: Option<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
};

/** Pill-style single-choice control (radio group) with arrow-key support. */
export default function SegmentedControl<T extends string>({ value, options, onChange, ariaLabel, className }: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn("inline-flex gap-1 rounded-full border bg-background p-1", className)}>
      {options.map((option, index) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            // Roving tab stop: only the selected option (or the first, if none) is tabbable.
            tabIndex={selected || (selectedIndex === -1 && index === 0) ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors sm:h-8 sm:flex-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              selected ? "bg-primary/10 text-link" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
