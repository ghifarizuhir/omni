import 'dotenv/config';
import http from 'node:http';
import { createApp } from './app';
import { initRealtime } from './realtime';
import { startScheduler } from './jobs';
import { initTelemetry } from './telemetry';

initTelemetry();

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';

const app = createApp();
const server = http.createServer(app);
initRealtime(server);

// Run scheduler in-process by default. In a worker-only deployment set
// API_ONLY=true on the API node and run scheduler in a separate process.
if (process.env.API_ONLY !== 'true') {
  startScheduler();
}

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] OIS API listening on http://${HOST}:${PORT}/api/v1`);
  // eslint-disable-next-line no-console
  console.log(`[server] Realtime socket at ws://${HOST}:${PORT}/api/v1/socket`);
});
