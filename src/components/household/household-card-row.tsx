"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ManageHouseholdDialog, ManageHouseholdButton } from "@/components/household/manage-household-dialog";
import { LeaveHouseholdDialog, LeaveHouseholdButton } from "@/components/household/leave-household-dialog";
import type { HouseholdListEntry } from "@/lib/actions/household";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  co_owner: "Co-Owner",
  member: "Member",
  viewer: "Viewer",
  limited_member: "Limited",
  split_only: "Split Only",
};

/**
 * A row of household cards — a visible, always-on-screen counterpart to
 * HouseholdSwitcher's dropdown (which stays in the header). The current
 * household reads at full opacity, the rest are dimmed until hovered or
 * clicked, and each card carries the same Manage/Leave action the dropdown
 * rows do (crown for the owner, leave icon for everyone else).
 */
export function HouseholdCardRow({
  households,
  currentId,
  basePath = "/goals",
  optionsMenu,
}: {
  households: HouseholdListEntry[];
  currentId: string;
  basePath?: string;
  /** Rendered beside the "Your Households" heading — the page's own options menu (e.g. GoalsOptionsMenu), kept out of this component so it stays page-agnostic. */
  optionsMenu?: ReactNode;
}) {
  const router = useRouter();
  const [manageTarget, setManageTarget] = useState<{ id: string; name: string } | null>(null);
  const [leaveTarget, setLeaveTarget] = useState<{ id: string; name: string } | null>(null);

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <p className="font-semibold text-foreground">Your Households</p>
        {optionsMenu}
      </div>
      {/* One line on mobile — a swipeable slider rather than wrapping into
          multiple rows — reverting to a normal wrap once there's room. */}
      <div className="flex flex-nowrap gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        {households.map((h) => {
          const active = h.household.id === currentId;
          const isOwner = h.role === "owner";
          return (
            <div
              key={h.household.id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`${basePath}?id=${h.household.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") router.push(`${basePath}?id=${h.household.id}`);
              }}
              className={cn(
                "w-56 shrink-0 cursor-pointer rounded-2xl border bg-card p-4 transition-all duration-200 ease-out hover:z-10 hover:scale-[1.03] hover:opacity-100 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:scale-100",
                !active && "opacity-60"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {ROLE_LABEL[h.role] ?? h.role}
                </span>
                {isOwner ? (
                  <ManageHouseholdButton onClick={() => setManageTarget({ id: h.household.id, name: h.household.name })} />
                ) : (
                  <LeaveHouseholdButton onClick={() => setLeaveTarget({ id: h.household.id, name: h.household.name })} />
                )}
              </div>
              <p className="mt-3 truncate font-semibold">🏠 {h.household.name}</p>
            </div>
          );
        })}
      </div>

      {manageTarget && (
        <ManageHouseholdDialog
          householdId={manageTarget.id}
          householdName={manageTarget.name}
          open={!!manageTarget}
          onOpenChange={(v) => {
            if (!v) setManageTarget(null);
          }}
          onDeleted={() => router.push(basePath)}
        />
      )}
      {leaveTarget && (
        <LeaveHouseholdDialog
          householdId={leaveTarget.id}
          householdName={leaveTarget.name}
          open={!!leaveTarget}
          onOpenChange={(v) => {
            if (!v) setLeaveTarget(null);
          }}
          onLeft={() => router.push(basePath)}
        />
      )}
    </div>
  );
}
