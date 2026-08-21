import { useEffect, useState } from "react";

/** Delays reflecting `value` until it's stayed still for `delayMs` — the
 * standard way to turn "search on every keystroke" into "search once
 * typing pauses" without a dedicated debounce dependency. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
