// Realtime gateway — Socket.IO server attached to the same HTTP listener.
//
// Pattern: one room per tenant per stream, e.g. `tenant:${id}:events`. The
// session middleware authorizes the upgrade; clients only join their own
// tenant room. Anywhere in the server, call `emit*` to push.
//
// In a multi-process deployment swap the default adapter for the Redis adapter
// (one line); the same room scheme keeps working.

import type { Server as HttpServer } from 'node:http';
import { Server as IOServer, type Socket } from 'socket.io';
import type { Event, InboxItem, IncidentTimelineEvent } from '../src/types';
import { resolveSession } from './auth/session';

let io: IOServer | undefined;

const cookieHeader = (raw: string | undefined): Record<string, string> => {
  if (!raw) return {};
  return raw.split(';').reduce<Record<string, string>>((acc, kv) => {
    const [k, v] = kv.trim().split('=');
    if (k) acc[k] = decodeURIComponent(v ?? '');
    return acc;
  }, {});
};

const room = (tenantId: string, stream: string) => `tenant:${tenantId}:${stream}`;

export const initRealtime = (server: HttpServer) => {
  io = new IOServer(server, {
    path: '/api/v1/socket',
    serveClient: false,
    cors: { origin: true, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const cookies = cookieHeader(socket.handshake.headers.cookie);
      const session = await resolveSession(cookies['ois_session']);
      if (!session) return next(new Error('Unauthorized'));
      (socket.data as { tenantId: string; userId: string }) = {
        tenantId: session.tenantId, userId: session.userId,
      };
      next();
    } catch (e) {
      next(e instanceof Error ? e : new Error('auth error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const { tenantId } = socket.data as { tenantId: string };
    socket.join(room(tenantId, 'events'));
    socket.join(room(tenantId, 'inbox'));
    socket.on('incident:subscribe', (incidentId: string) => {
      socket.join(`tenant:${tenantId}:incident:${incidentId}`);
    });
    socket.on('incident:unsubscribe', (incidentId: string) => {
      socket.leave(`tenant:${tenantId}:incident:${incidentId}`);
    });
  });

  return io;
};

export const emitEventCreated = (tenantId: string, event: Event) => {
  io?.to(room(tenantId, 'events')).emit('event:created', event);
};
export const emitEventUpdated = (tenantId: string, event: Event) => {
  io?.to(room(tenantId, 'events')).emit('event:updated', event);
};
export const emitInbox = (tenantId: string, item: InboxItem) => {
  io?.to(room(tenantId, 'inbox')).emit('inbox:item', item);
};
export const emitIncidentTimeline = (tenantId: string, incidentId: string, entry: IncidentTimelineEvent) => {
  io?.to(`tenant:${tenantId}:incident:${incidentId}`).emit('incident:timeline', entry);
};

export const getIO = () => io;
