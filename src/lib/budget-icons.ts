import { Fuel, Heart, Gift, Home, ShoppingCart, UtensilsCrossed, ShoppingBag, Plane, Receipt, type LucideIcon } from "lucide-react";

/**
 * The fixed set of spending-budget name presets — shown as outline-icon
 * pills in the "Name" picker (see CreateGoalDialog) and, via
 * budgetIconFor() below, as the outline icon a budget's card/header
 * renders wherever its stored emoji `icon` (still what's persisted and
 * shown in older/non-Expenses contexts, e.g. goal-card.tsx's saving goals)
 * matches one of these.
 */
export const BUDGET_NAME_PRESETS: { name: string; icon: string; Icon: LucideIcon }[] = [
  { name: "Fuel", icon: "⛽", Icon: Fuel },
  { name: "Health", icon: "❤️", Icon: Heart },
  { name: "Gift", icon: "🎁", Icon: Gift },
  { name: "Home", icon: "🏠", Icon: Home },
  { name: "Groceries", icon: "🛒", Icon: ShoppingCart },
  { name: "Eating Out", icon: "🍽️", Icon: UtensilsCrossed },
  { name: "Shopping", icon: "🛍️", Icon: ShoppingBag },
  { name: "Travel", icon: "✈️", Icon: Plane },
];

const iconByEmoji = new Map(BUDGET_NAME_PRESETS.map((p) => [p.icon, p.Icon]));

/** A spending budget's outline icon for its stored emoji — falls back to a generic receipt icon for anything outside the known preset set (a custom-typed name, or a budget created before this preset list existed). */
export function budgetIconFor(emoji: string): LucideIcon {
  return iconByEmoji.get(emoji) ?? Receipt;
}
