import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import NumberPopIn from "@/components/NumberPopIn";

const controlBase =
  "inline-flex items-center justify-center rounded-full text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:pointer-events-none disabled:opacity-50";

type SectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function ControlSection({ title, children, className }: SectionProps) {
  return (
    <section
      className={cn(
        "space-y-3 border-b border-border pb-4 last:border-b-0 last:pb-0",
        className,
      )}
    >
      <h2 className="font-mono text-xs text-subtle uppercase">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

type RangeFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
};

export function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: RangeFieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono text-foreground tabular-nums flex items-baseline">
          <NumberPopIn>{value}</NumberPopIn>
          {unit ?? ""}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-pill accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      />
    </label>
  );
}

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-7 cursor-pointer rounded border border-border bg-transparent p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-22 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs text-foreground outline-none focus-visible:border-border-strong focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
        />
      </span>
    </label>
  );
}

type ToggleFieldProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function ToggleField({ label, checked, onChange }: ToggleFieldProps) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      />
    </label>
  );
}

type SegmentedOption<T extends string> = {
  id: T;
  label: string;
  icon?: ReactNode;
};

type SegmentedControlProps<T extends string> = {
  ariaLabel: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
};

export function SegmentedControl<T extends string>({
  ariaLabel,
  value,
  options,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div aria-label={ariaLabel} className={cn("flex flex-wrap gap-1.5", className)} role="group">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            controlBase,
            "h-7 gap-1.5 px-2.5",
            value === option.id
              ? "bg-pill-active text-pill-active-fg"
              : "bg-pill text-muted hover:bg-pill-hover hover:text-foreground",
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

type StudioButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function StudioButton({
  active = false,
  className,
  children,
  ...props
}: StudioButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        controlBase,
        "h-7 gap-1.5 px-2.5",
        active
          ? "bg-pill-active text-pill-active-fg"
          : "bg-pill text-muted hover:bg-pill-hover hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
