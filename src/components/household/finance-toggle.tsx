export interface HouseholdMemberLite {
  userId: string;
  name: string;
  avatarUrl: string | null;
  /** Present when sourced from a group/goal's own membership list (getSplitGroupMembers/listGoalMembers) — absent for the plain household roster. */
  isCreator?: boolean;
}
