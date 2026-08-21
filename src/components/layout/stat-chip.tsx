import { cn } from "@/lib/utils";

/** One of the small labelled boxes in a hero card's status row — e.g. EXPIRED / SOON / FINE, or BUDGET / SPENT / LEFT. */
export function StatChip({
  label,
  value,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "destructive" | "positive";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-3 py-2",
        tone === "destructive" ? "bg-blush-tint text-destructive" : tone === "positive" ? "bg-accent text-accent-foreground" : "bg-muted text-foreground",
        className
      )}
    >
      <p
        className={cn(
          "font-mono text-[10px] tracking-[0.14em] uppercase",
          tone === "destructive" ? "text-destructive/80" : tone === "positive" ? "text-accent-foreground/80" : "text-muted-foreground"
        )}
      >
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold">{value}</p>
    </div>
  );
}
