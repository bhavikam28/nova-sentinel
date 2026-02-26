/**
 * Detect AWS service principals in timeline events.
 * Actors ending in .amazonaws.com are AWS-managed services, not human users —
 * often low suspicion (e.g. resource-explorer-2.amazonaws.com).
 */
import type { Timeline } from '../types/incident';

const AWS_SERVICE_PATTERN = /\.amazonaws\.com$/i;

export function isAwsServicePrincipal(actor: string | undefined): boolean {
  if (!actor || typeof actor !== 'string') return false;
  return AWS_SERVICE_PATTERN.test(actor.trim());
}

export function hasAwsServicePrincipalInTimeline(timeline: Timeline | null | undefined): boolean {
  const events = timeline?.events || [];
  return events.some(
    e => isAwsServicePrincipal(e.actor) || isAwsServicePrincipal((e.details as any)?.actor)
  );
}

export function getAwsServicePrincipalFromTimeline(timeline: Timeline | null | undefined): string | null {
  const events = timeline?.events || [];
  for (const e of events) {
    if (isAwsServicePrincipal(e.actor)) return e.actor;
  }
  return null;
}
