"use client";

/**
 * Personal Piggy's 2D mascot — plain inline SVG animated with the CSS
 * keyframes in globals.css (no animation library, no 3D, no canvas).
 * `mood` drives which one-shot reaction plays (idle otherwise keeps
 * breathing gently); `fullness` (0–1, derived from the balance) subtly
 * grows the belly, capped so it never distorts the rest of the layout;
 * `coinEvent` triggers a brief coin-drop animation without changing mood.
 * Every animated element degrades to a static pose under
 * prefers-reduced-motion (see globals.css) — mood/fullness are still
 * conveyed instantly, just without motion.
 */
export type PiggyMood = "idle" | "happy" | "sad" | "empty";
export type PiggyCoinEvent = "in" | "out" | null;

export function Piggy({
  mood = "idle",
  fullness = 0,
  coinEvent = null,
  className,
}: {
  mood?: PiggyMood;
  fullness?: number;
  coinEvent?: PiggyCoinEvent;
  className?: string;
}) {
  const f = Math.max(0, Math.min(1, fullness));
  const bodyRx = 66 + f * 10;
  const bodyRy = 48 + f * 7;
  const bodyCy = 118 - f * 3;

  const bodyAnimClass = mood === "happy" ? "piggy-body-happy" : mood === "sad" ? "piggy-body-sad" : "piggy-body-idle";

  return (
    <svg
      viewBox="0 0 240 220"
      className={className}
      role="img"
      aria-label={
        mood === "empty"
          ? "Your Piggy is empty"
          : mood === "happy"
            ? "Piggy happily wiggling"
            : mood === "sad"
              ? "Piggy giving up some coins"
              : "Piggy"
      }
    >
      <ellipse cx="120" cy="200" rx="62" ry="9" fill="#000" opacity="0.08" />

      <g className={bodyAnimClass}>
        {/* Legs */}
        <rect x="70" y="168" width="14" height="26" rx="7" fill="var(--deep-rose)" />
        <rect x="100" y="172" width="14" height="24" rx="7" fill="var(--deep-rose)" />
        <rect x="130" y="172" width="14" height="24" rx="7" fill="var(--deep-rose)" />
        <rect x="158" y="168" width="14" height="26" rx="7" fill="var(--deep-rose)" />

        {/* Tail */}
        <path
          d="M60 108 C44 100, 44 118, 56 122"
          fill="none"
          stroke="var(--deep-rose)"
          strokeWidth="6"
          strokeLinecap="round"
          className="piggy-tail"
        />

        {/* Ears */}
        <g className="piggy-ear-wiggle">
          <path d="M78 66 C70 44, 96 42, 100 62 Z" fill="var(--deep-rose)" />
        </g>
        <g className="piggy-ear-wiggle" style={{ animationDelay: "0.3s" }}>
          <path d="M150 62 C156 42, 182 46, 172 68 Z" fill="var(--deep-rose)" />
        </g>

        {/* Body */}
        <ellipse cx="120" cy={bodyCy} rx={bodyRx} ry={bodyRy} fill="var(--blush)" />

        {/* Snout */}
        <ellipse cx="178" cy={bodyCy + 6} rx="26" ry="20" fill="var(--blush-tint)" />
        <ellipse cx="170" cy={bodyCy + 6} rx="4" ry="6" fill="var(--deep-rose)" />
        <ellipse cx="186" cy={bodyCy + 6} rx="4" ry="6" fill="var(--deep-rose)" />

        {/* Eyes */}
        <g>
          <ellipse cx="140" cy={bodyCy - 14} rx="5" ry="6.5" fill="var(--foreground)" className="piggy-eye-blink" />
          <ellipse cx="164" cy={bodyCy - 16} rx="5" ry="6.5" fill="var(--foreground)" className="piggy-eye-blink" style={{ animationDelay: "0.15s" }} />
          {mood !== "sad" && (
            <>
              <circle cx="142" cy={bodyCy - 16} r="1.4" fill="#fff" />
              <circle cx="166" cy={bodyCy - 18} r="1.4" fill="#fff" />
            </>
          )}
        </g>

        {/* Coin slot on the back */}
        <g>
          <rect x="104" y={bodyCy - bodyRy + 4} width="26" height="6" rx="3" fill="var(--foreground)" opacity="0.35" className={coinEvent ? "piggy-slot-active" : undefined} />
        </g>
      </g>

      {/* Coins — transient, layered above the body group so they visually pass through the slot */}
      {coinEvent === "in" && (
        <g className="piggy-coin-in" style={{ transformOrigin: "117px " + (bodyCy - bodyRy + 4) + "px" }}>
          <circle cx="117" cy={bodyCy - bodyRy - 10} r="7" fill="#F4C542" stroke="#C99A1E" strokeWidth="1.5" />
        </g>
      )}
      {coinEvent === "out" && (
        <>
          <g className="piggy-coin-out" style={{ "--coin-x": "-14px" } as React.CSSProperties}>
            <circle cx="112" cy={bodyCy - bodyRy + 6} r="6" fill="#F4C542" stroke="#C99A1E" strokeWidth="1.5" />
          </g>
          <g className="piggy-coin-out" style={{ "--coin-x": "18px", animationDelay: "0.08s" } as React.CSSProperties}>
            <circle cx="124" cy={bodyCy - bodyRy + 6} r="6" fill="#F4C542" stroke="#C99A1E" strokeWidth="1.5" />
          </g>
        </>
      )}
    </svg>
  );
}
