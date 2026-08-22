"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

/**
 * The "SPLIT DETAIL" header's share icon — the Web Share sheet on a device
 * that has one, otherwise a clipboard copy (same graceful-degradation shape
 * as CreateSplitGroupDialog's invite link).
 */
export function SplitDetailShareButton({ groupName, sharePath }: { groupName: string; sharePath: string }) {
  async function handleShare() {
    const shareUrl = `${window.location.origin}${sharePath}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: groupName, text: `"${groupName}" on My Space — Let's Split`, url: shareUrl });
      } catch {
        // User backed out of the share sheet — not an error.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label="Share this split"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#EFF1EA] text-[#212529] transition-colors hover:bg-[#E4E7DD]"
    >
      <Share2 className="size-4" />
    </button>
  );
}
