import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The gradient "band" that opens every app page — teal → olive → rose,
 * matching the Let's Split wallet pattern the rest of the app was rebuilt
 * on. `MobileBand` carries the page title and (optionally) two live
 * numbers; `DesktopBand` carries a breadcrumb, a sentence-headline and a
 * primary action. They're separate components (rather than one
 * responsive one) because the two breakpoints show different content,
 * not just a resized version of the same layout.
 */

function RoundIconButton({ href, onClick, children, ariaLabel }: { href?: string; onClick?: () => void; children: ReactNode; ariaLabel: string }) {
  const className = "flex size-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-foreground backdrop-blur-sm transition-colors hover:bg-white/90";
  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} className={className}>
      {children}
    </button>
  );
}

export function MobileBand({
  title,
  backHref,
  right,
  stats,
  className,
}: {
  title: string;
  backHref?: string;
  right?: ReactNode;
  stats?: [{ label: string; value: ReactNode; tone?: "default" | "destructive" }, { label: string; value: ReactNode; tone?: "default" | "destructive" }];
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-b-[30px] px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-6 md:hidden", className)}
      style={{ backgroundImage: "var(--band-gradient)" }}
    >
      <div className="flex items-center justify-between gap-2">
        {backHref ? (
          <RoundIconButton href={backHref} ariaLabel="Back">
            <ChevronLeft className="size-5" />
          </RoundIconButton>
        ) : (
          <span className="size-9" />
        )}
        <p className="font-mono text-xs font-medium tracking-[0.18em] text-foreground uppercase">{title}</p>
        {right ?? <span className="size-9" />}
      </div>

      {stats && (
        <div className="mt-6 flex items-start justify-between">
          <div>
            <p className="font-mono text-[10.5px] tracking-[0.16em] text-foreground/70 uppercase">{stats[0].label}</p>
            <p className={cn("mt-1 font-heading text-4xl leading-none", stats[0].tone === "destructive" ? "text-destructive" : "text-foreground")}>{stats[0].value}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10.5px] tracking-[0.16em] text-foreground/70 uppercase">{stats[1].label}</p>
            <p className={cn("mt-1 font-heading text-4xl leading-none", stats[1].tone === "destructive" ? "text-destructive" : "text-foreground")}>{stats[1].value}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export { RoundIconButton };

export function DesktopBand({
  breadcrumb,
  title,
  subtitle,
  action,
  className,
}: {
  breadcrumb: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("hidden rounded-[26px] p-8 md:block", className)}
      style={{ backgroundImage: "var(--band-gradient-desktop)" }}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="font-mono text-xs font-medium tracking-[0.18em] text-foreground/70 uppercase">{breadcrumb}</p>
          <h1 className="mt-1 font-heading text-4xl leading-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-foreground/75">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

/** Wraps a mobile hero card so it overlaps the band above it, per the mockup. Desktop content should not use this — it sits in the plain two-pane layout instead. */
export function MobileHeroOverlap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("relative z-10 -mt-9 px-4 md:hidden", className)}>{children}</div>;
}
