import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** A plain white row — icon, title/subtitle, trailing content — the unit the wallet pattern uses instead of card grids for lists (rooms, places, expenses, members…). */
export function ListRow({
  icon,
  iconClassName,
  title,
  subtitle,
  trailing,
  href,
  onClick,
  className,
  chevron = false,
  barPct,
}: {
  icon?: ReactNode;
  iconClassName?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  chevron?: boolean;
  /** 0-100 — renders a thin progress bar under the row (e.g. a room's "most used" fill), omit for a plain row. */
  barPct?: number;
}) {
  const content = (
    <>
      <span className="flex items-center gap-3">
        {icon && (
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground", iconClassName)}>
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-foreground">{title}</span>
          {subtitle && <span className="mt-0.5 block truncate text-sm text-muted-foreground">{subtitle}</span>}
        </span>
        {trailing}
        {chevron && <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
      </span>
      {typeof barPct === "number" && (
        <span className="mt-2.5 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full bg-secondary" style={{ width: `${Math.max(0, Math.min(100, barPct))}%` }} />
        </span>
      )}
    </>
  );

  const rowClassName = cn(
    "flex flex-col rounded-2xl bg-white px-4 py-3.5 text-left",
    (href || onClick) && "transition-colors hover:bg-muted/60",
    className
  );

  if (href) {
    return (
      <Link href={href} className={rowClassName}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(rowClassName, "w-full")}>
        {content}
      </button>
    );
  }
  return <div className={rowClassName}>{content}</div>;
}
