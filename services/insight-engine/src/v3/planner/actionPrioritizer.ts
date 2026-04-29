import type { ActionPlan, ActionUrgency } from "@orgos/shared-types";

const URGENCY_ORDER: ActionUrgency[] = ["IMMEDIATE", "24H", "7D"];

/**
 * Sorts action plans into execution order.
 * Primary sort: priority ascending (P0 first).
 * Tiebreak: urgency (IMMEDIATE before 24H before 7D).
 * Secondary tiebreak: ESCALATE execution mode first within same priority.
 */
export function prioritizeActions(plans: ActionPlan[]): ActionPlan[] {
  return [...plans].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const urgencyDiff = URGENCY_ORDER.indexOf(a.urgency) - URGENCY_ORDER.indexOf(b.urgency);
    if (urgencyDiff !== 0) return urgencyDiff;
    // HUMAN_APPROVAL (ESCALATE) before AUTO/SYSTEM at same urgency
    if (a.executionMode === "HUMAN_APPROVAL" && b.executionMode !== "HUMAN_APPROVAL") return -1;
    if (b.executionMode === "HUMAN_APPROVAL" && a.executionMode !== "HUMAN_APPROVAL") return 1;
    return 0;
  });
}
