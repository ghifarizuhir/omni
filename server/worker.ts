// M7 scaffolding: worker process entry.
//
// Today: runs the in-process scheduler (`server/jobs`) without binding the HTTP
// server. The API container can run with API_ONLY=true and offload SLA / future
// jobs to this worker image so they scale independently.
//
// TODO(M8+): replace polling scheduler with BullMQ (Redis-backed) workers and
// move job definitions under `server/jobs/*` to dedicated processors here.

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv();
import { startScheduler, stopScheduler } from './jobs';
import { initTelemetry } from './telemetry';

initTelemetry();

// eslint-disable-next-line no-console
console.log('[worker] OIS worker starting — running in-process scheduler');
startScheduler();

function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`[worker] received ${signal}, stopping scheduler`);
  stopScheduler();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
