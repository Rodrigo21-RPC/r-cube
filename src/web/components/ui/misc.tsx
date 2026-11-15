import { Dialog as D } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@web/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[18px] bg-surface p-5", className)} {...props} />;
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: "neutral" | "success" | "warning" | "danger" | "accent" }) {
  const tones = {
    neutral: "bg-surface-2 text-text",
    success: "bg-canvas text-success ring-1 ring-inset ring-success/40",
    warning: "bg-canvas text-warning ring-1 ring-inset ring-warning/40",
    danger: "bg-canvas text-danger ring-1 ring-inset ring-danger/40",
    accent: "bg-canvas text-accent ring-1 ring-inset ring-accent/40",
  };
  return (
    <span
      className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden className={cn("animate-pulse rounded-2xl bg-surface-2", className)} {...props} />;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <D.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[18px] bg-canvas p-6 text-text shadow-xl">
          <D.Title className="text-lg font-semibold">{title}</D.Title>
          {description && <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>}
          <div className="mt-4">{children}</div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
