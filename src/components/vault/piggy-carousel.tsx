"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A horizontal, scroll-snap carousel for the Piggy/Regular Savings/Savings
 * History cards — CSS scroll-snap gives free touch-swipe on mobile, arrow
 * buttons + dots cover desktop/keyboard, and the track's height animates to
 * match whichever slide is active (via ResizeObserver) instead of always
 * reserving space for the tallest one.
 */
export function PiggyCarousel({ slides }: { slides: ReactNode[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = slideRefs.current[active];
    if (!el) return;
    const update = () => setHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [active]);

  function scrollToIndex(i: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    setActive((prev) => (prev === i ? prev : i));
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        style={{ height }}
        className="scrollbar-hide flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth transition-[height] duration-300 ease-out motion-reduce:transition-none"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
            className="w-full shrink-0 snap-center self-start"
          >
            <div className="p-1.5 transition-transform duration-300 ease-out hover:scale-[1.015] motion-reduce:transition-none motion-reduce:hover:scale-100">
              {slide}
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollToIndex(Math.max(0, active - 1))}
            disabled={active === 0}
            aria-label="Previous"
            className="absolute top-1/2 -left-3 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-card shadow-sm transition hover:bg-muted disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(Math.min(slides.length - 1, active + 1))}
            disabled={active === slides.length - 1}
            aria-label="Next"
            className="absolute top-1/2 -right-3 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-card shadow-sm transition hover:bg-muted disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronRight className="size-4" />
          </button>

          <div className="mt-3 flex items-center justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  active === i ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
