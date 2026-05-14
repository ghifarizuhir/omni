// Live mode is the only mode now. The legacy `VITE_API_MODE` switch and the
// `mockResult`/`mockRequired` helpers were removed in the M3 backlog cleanup.

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';
