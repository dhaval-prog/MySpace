"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DRAG_THRESHOLD_RATIO = 0.2;
/** Pixels of movement before a pointer-down commits to a carousel drag
 * rather than being left alone as a normal tap/click on whatever's inside
 * the slide (a button, an input, a select) — without this, every click on
 * "Add Money" or a form field would get captured as a swipe instead. */
const DRAG_COMMIT_PX = 8;

/**
 * A drag-controlled carousel for the Piggy/Regular Savings/Savings History
 * cards. Deliberately NOT native scroll-snap: a fast swipe under
 * scroll-snap's momentum physics can fling past an intermediate snap point
 * straight to the next one (skipping a slide), which is exactly the bug this
 * replaces — every drag here explicitly lands on index±1 or springs back,
 * never further. Arrow buttons + dots cover non-touch input, and the
 * track's height animates to match whichever slide is active (via
 * ResizeObserver) instead of always reserving space for the tallest one.
 */
export function PiggyCarousel({ slides }: { slides: ReactNode[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; pointerId: number; committed: boolean } | null>(null);

  useEffect(() => {
    const el = slideRefs.current[active];
    if (!el) return;
    const update = () => setHeight(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [active]);

  function goTo(i: number) {
    setActive(Math.min(slides.length - 1, Math.max(0, i)));
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    dragStartRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId, committed: false };
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    if (!start.committed) {
      if (Math.abs(dx) < DRAG_COMMIT_PX && Math.abs(dy) < DRAG_COMMIT_PX) return;
      // A more-vertical gesture is a page scroll, not a swipe — bail out
      // and leave it alone instead of hijacking it.
      if (Math.abs(dy) > Math.abs(dx)) {
        dragStartRef.current = null;
        return;
      }
      start.committed = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    let delta = dx;
    // Resist dragging past the first/last slide instead of allowing it to
    // travel freely off into empty space.
    if ((active === 0 && delta > 0) || (active === slides.length - 1 && delta < 0)) delta *= 0.35;
    setDragX(delta);
  }

  function endDrag() {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start?.committed) return; // was just a tap on the slide's own content
    setDragging(false);
    const width = trackRef.current?.clientWidth || 1;
    if (dragX < -width * DRAG_THRESHOLD_RATIO) goTo(active + 1);
    else if (dragX > width * DRAG_THRESHOLD_RATIO) goTo(active - 1);
    setDragX(0);
  }

  return (
    <div className="relative">
      <div ref={trackRef} className="overflow-hidden" style={{ height }}>
        <div
          className={cn(
            "flex touch-pan-y ease-out motion-reduce:transition-none",
            dragging ? "transition-none" : "transition-transform duration-300"
          )}
          style={{ transform: `translateX(calc(-${active * 100}% + ${dragX}px))` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              ref={(el) => {
                slideRefs.current[i] = el;
              }}
              className="w-full shrink-0 self-start"
            >
              <div className="p-1.5 transition-transform duration-300 ease-out hover:scale-[1.015] motion-reduce:transition-none motion-reduce:hover:scale-100">
                {slide}
              </div>
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(active - 1)}
            disabled={active === 0}
            aria-label="Previous"
            className="absolute top-1/2 -left-3 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border bg-card shadow-sm transition hover:bg-muted disabled:pointer-events-none disabled:opacity-0 sm:flex"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => goTo(active + 1)}
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
                onClick={() => goTo(i)}
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
