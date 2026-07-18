import type { CohortDashboard } from "@/schemas";

/** People whose onboarding isn't finished yet (passed fewer modules than assigned). */
export function peopleStillOnboarding(cohort: CohortDashboard): number {
  return cohort.employees.filter((e) => e.passedCount < e.totalCount).length;
}

/** One honest line summarizing what, if anything, needs the admin's attention. */
export function statusLine(cohort: CohortDashboard | undefined, highRiskCount: number): string {
  if (!cohort) {
    return "Here's the state of your team and where knowledge is concentrated.";
  }
  const onboarding = peopleStillOnboarding(cohort);
  const parts: string[] = [];
  if (onboarding > 0) {
    parts.push(`${onboarding} ${onboarding === 1 ? "person is" : "people are"} still onboarding`);
  }
  if (highRiskCount > 0) {
    parts.push(
      `${highRiskCount} ${highRiskCount === 1 ? "area" : "areas"} of the code only one person understands`,
    );
  }
  if (parts.length === 0) {
    return "Everyone's onboarded and knowledge is well spread — nothing needs you right now.";
  }
  // Capitalize the first clause, join with a middot.
  const joined = parts.join(" · ");
  return `${joined[0].toUpperCase()}${joined.slice(1)}.`;
}
