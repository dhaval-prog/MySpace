export type ExpiryLevel = "none" | "normal" | "soon" | "expired";

export interface ExpiryStatus {
  level: ExpiryLevel;
  label: string;
}

function daysUntil(expiryDate: string): number {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = expiryDate.split("-").map(Number);
  const expiryMidnight = new Date(y, m - 1, d);
  return Math.round((expiryMidnight.getTime() - todayMidnight.getTime()) / 86_400_000);
}

/**
 * Normal (>7 days remaining) / Expiring Soon (0-7 days remaining) / Expired
 * (date has passed) — the three states from spec section 10. `expiryDate`
 * is a plain "YYYY-MM-DD" (Postgres `date`, no time/timezone component).
 */
export function expiryStatus(expiryDate: string | null): ExpiryStatus {
  if (!expiryDate) return { level: "none", label: "" };

  const diff = daysUntil(expiryDate);

  if (diff < 0) {
    const daysAgo = -diff;
    return { level: "expired", label: daysAgo === 1 ? "Expired yesterday" : `Expired ${daysAgo} days ago` };
  }

  if (diff <= 7) {
    if (diff === 0) return { level: "soon", label: "Expires today" };
    if (diff === 1) return { level: "soon", label: "Expires tomorrow" };
    return { level: "soon", label: `Expires in ${diff} days` };
  }

  const [y, m, d] = expiryDate.split("-").map(Number);
  const month = new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short" });
  return { level: "normal", label: `Expires ${month} ${d}` };
}
