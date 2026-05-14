// Frontend realtime client. Wraps Socket.IO so pages can subscribe to push
// updates without coupling to the transport.
//
// Usage:
//   const sub = realtime.on('event:created', (e) => …);
//   return () => sub.unsubscribe();
//
// Reconnect strategy: Socket.IO handles transport retries with exponential
// backoff (default: 1s → 5s cap, ∞ attempts). On reconnect, pages MUST
// re-fetch the authoritative REST list and reconcile — the stream is not
// replayed.

import { io, type Socket } from 'socket.io-client';
import type { Event, InboxItem, IncidentTimelineEvent } from '../types';

interface ServerToClient {
  'event:created': (e: Event) => void;
  'event:updated': (e: Event) => void;
  'inbox:item': (it: InboxItem) => void;
  'incident:timeline': (entry: IncidentTimelineEvent) => void;
}

let socket: Socket | undefined;

const getSocket = (): Socket => {
  if (socket) return socket;
  socket = io({
    path: '/api/v1/socket',
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 5_000,
  });
  return socket;
};

export const realtime = {
  /** Subscribe to a server event. Returns an `unsubscribe` cleanup function. */
  on<K extends keyof ServerToClient>(event: K, handler: ServerToClient[K]) {
    const s = getSocket();
    s.on(event as string, handler as (...args: unknown[]) => void);
    return {
      unsubscribe: () => s.off(event as string, handler as (...args: unknown[]) => void),
    };
  },

  /** Subscribe to live updates for a single incident's timeline. */
  subscribeIncident(incidentId: string) {
    const s = getSocket();
    s.emit('incident:subscribe', incidentId);
    return {
      unsubscribe: () => s.emit('incident:unsubscribe', incidentId),
    };
  },

  /** Force-disconnect — useful in tests and on logout. */
  disconnect() {
    socket?.disconnect();
    socket = undefined;
  },
};

// React hook helper so pages don't have to manage cleanup themselves.
import { useEffect } from 'react';
export function useRealtime<K extends keyof ServerToClient>(
  event: K,
  handler: ServerToClient[K],
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const sub = realtime.on(event, handler);
    return sub.unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, enabled]);
}
