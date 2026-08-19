"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Portals its children into the mobile-only "#header-page-actions" slot
 * rendered by the global Header — used by individual pages (Home, Goals,
 * Split) to put their local options menu beside the profile avatar on
 * mobile, since the page and the header are siblings under the shared
 * layout rather than parent/child. Renders nothing until the target exists
 * in the DOM (post-mount), so there's no server/client markup mismatch.
 */
export function HeaderActionsPortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    // The portal target is a DOM node from a sibling tree (the layout's
    // Header), not derivable from props/state during render — this only
    // runs once, post-mount, to discover it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTarget(document.getElementById("header-page-actions"));
  }, []);

  if (!target) return null;
  return createPortal(children, target);
}
