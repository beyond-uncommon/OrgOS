import { randomUUID } from "node:crypto";
import { log, logError } from "@orgos/utils";
import type { InsightForecast, ActionPlan } from "@orgos/shared-types";
import { ActionEvents } from "./config/actionEventTypes.js";
import { applyDecisionPolicy } from "./policy/decisionPolicyEngine.js";
import { planAction } from "./planner/actionPlanner.js";
import { prioritizeActions } from "./planner/actionPrioritizer.js";
import { routeAction, type RoutingResult } from "./execution/executionRouter.js";

export interface GenerateActionsResult {
  decisions:      number;
  actionsPlanned: number;
  routing:        RoutingResult[];
  blocked:        number;
}

/**
 * The v3 action pipeline.
 *
 * Flow:
 * 1. Decision policy engine evaluates the forecast — deterministic rules only
 * 2. Action planner converts actionable decisions to structured ActionPlans
 * 3. Action prioritizer orders plans by risk severity and urgency
 * 4. Execution router dispatches each plan to the correct execution path
 *
 * MONITOR decisions produce no action plan — they are counted but not routed.
 * Nothing irreversible executes without explicit human approval.
 */
export async function generateActions(forecast: InsightForecast): Promise<GenerateActionsResult> {
  const actionRunId = randomUUID();
  const run = Object.freeze({ actionRunId, departmentId: forecast.departmentId, logVersion: 1 });

  log(ActionEvents.STARTED, run);

  try {
    // Step 1 — Policy: evaluate all forward signals and produce DecisionSignals
    const decisions = applyDecisionPolicy(forecast);

    // Step 2 — Plan: convert actionable decisions (INTERVENE + ESCALATE) to ActionPlans
    // Carry sourceLikelihood through for governance threshold evaluation
    const plansWithLikelihood: { plan: ActionPlan; likelihood: number }[] = decisions
      .flatMap((d) => {
        const plan = planAction(d, forecast.departmentId, actionRunId);
        if (!plan) return [];
        const likelihood = "likelihood" in d.sourceSignal ? d.sourceSignal.likelihood : 0;
        return [{ plan, likelihood }];
      });

    const plans = plansWithLikelihood.map((p) => p.plan);

    // Step 3 — Prioritize: returns a re-ordered subset of the same plan objects
    const prioritized = prioritizeActions(plans);

    // Step 4 — Route through governance guard then executor
    // Use object identity to reconnect each plan to its source likelihood
    const likelihoodMap = new Map<ActionPlan, number>(
      plansWithLikelihood.map(({ plan, likelihood }) => [plan, likelihood]),
    );
    const routing = await Promise.all(
      prioritized.map((p) => routeAction(p, likelihoodMap.get(p) ?? 0)),
    );

    const result: GenerateActionsResult = {
      decisions:      decisions.length,
      actionsPlanned: plans.length,
      routing,
      blocked:        routing.filter((r) => r.outcome === "BLOCKED").length,
    };

    log(ActionEvents.COMPLETED, {
      ...run,
      decisions:       decisions.length,
      actionsPlanned:  plans.length,
      queued:          routing.filter((r) => r.outcome === "QUEUED").length,
      autoExecuted:    routing.filter((r) => r.outcome === "EXECUTED").length,
      blocked:         result.blocked,
    });

    return result;
  } catch (err) {
    logError(ActionEvents.FAILED, err, run);
    throw err;
  }
}
