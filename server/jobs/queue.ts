// Background-job runner. Tiny in-process scheduler so the demo runs without
// Redis; the public API (`schedule`, `defineJob`) is shaped like BullMQ so the
// swap-in is a 5-line change once Redis is provisioned.
//
// Each defined job has a fixed interval. Jobs run on the API process for now;
// in production they move to a dedicated worker process by setting
// `WORKER=true` (so the API doesn't run them) and a separate `worker` script.

type JobFn = () => Promise<void> | void;
interface JobDef { name: string; intervalMs: number; fn: JobFn; }

const jobs: JobDef[] = [];
let timers: NodeJS.Timeout[] = [];

export const defineJob = (def: JobDef) => { jobs.push(def); };

export const startScheduler = () => {
  if (timers.length) return; // idempotent
  for (const j of jobs) {
    const run = async () => {
      try { await j.fn(); }
      // eslint-disable-next-line no-console
      catch (e) { console.error(`[job:${j.name}] error:`, e); }
    };
    // Run once on boot then on interval.
    void run();
    timers.push(setInterval(run, j.intervalMs));
  }
  // eslint-disable-next-line no-console
  console.log(`[jobs] started ${jobs.length} job(s)`);
};

export const stopScheduler = () => {
  for (const t of timers) clearInterval(t);
  timers = [];
};
