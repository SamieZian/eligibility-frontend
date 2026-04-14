/**
 * Thin wrapper around graphql-ws for BFF subscriptions.
 *
 * We lazy-connect on first subscribe and share a single WebSocket client
 * across all subscribers in the app — graphql-ws multiplexes subscriptions
 * over a single socket by operation id, so one connection handles any
 * number of open drawers.
 */
import { createClient, type Client } from 'graphql-ws';

export interface EnrollmentUpdateEvent {
  eventType: string;
  occurredAt: string;
}

let _client: Client | null = null;

function client(): Client {
  if (_client) return _client;
  const base =
    (import.meta.env.VITE_BFF_URL as string | undefined) ?? 'http://localhost:4000';
  const wsUrl = base.replace(/^http/, 'ws').replace(/\/$/, '') + '/graphql';
  _client = createClient({
    url: wsUrl,
    retryAttempts: Infinity,
    // Auth hook-point for when the BFF gets a bearer scheme over WS.
    connectionParams: () => ({}),
  });
  return _client;
}

/**
 * Subscribe to enrollment-impacting events for a specific member.
 * Returns an unsubscribe function — call it on component unmount.
 */
export function subscribeEnrollmentUpdates(
  memberId: string,
  onEvent: (e: EnrollmentUpdateEvent) => void,
): () => void {
  const unsubscribe = client().subscribe<{
    enrollmentUpdated: EnrollmentUpdateEvent | null;
  }>(
    {
      query:
        'subscription OnEnrollmentUpdated($m: ID!) { enrollmentUpdated(memberId: $m) { eventType occurredAt } }',
      variables: { m: memberId },
    },
    {
      next: ({ data }) => {
        if (data?.enrollmentUpdated) onEvent(data.enrollmentUpdated);
      },
      error: (e) => {
        // Keep the dev console informed; retryAttempts=Infinity means the
        // client will reconnect automatically, so we don't surface UX errors.
        console.warn('[subscription] error', e);
      },
      complete: () => {},
    },
  );
  return unsubscribe;
}
