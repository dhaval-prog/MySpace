import { cn } from "@/lib/utils";
import { expiryStatus } from "@/lib/expiry";

const LEVEL_STYLES: Record<"normal" | "soon" | "expired", string> = {
  normal: "text-muted-foreground",
  soon: "text-amber-600",
  expired: "text-destructive",
};

/** Renders nothing when the item has no expiry date — permanent items (a passport, a remote) shouldn't show an empty expiry row. */
export function ExpiryBadge({ expiryDate, className }: { expiryDate: string | null; className?: string }) {
  const status = expiryStatus(expiryDate);
  if (status.level === "none") return null;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", LEVEL_STYLES[status.level], className)}>
      {status.level === "soon" && "🟠"}
      {status.level === "expired" && "🔴"}
      {status.label}
    </span>
  );
}
