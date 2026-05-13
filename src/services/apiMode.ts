// API mode switch.
//
// Services delegate to the mock data layer when VITE_API_MODE is "mock" (the
// default) and to a real HTTP client when it is "live". Routes never branch
// on the mode themselves — they just await the service.

export type ApiMode = 'mock' | 'live';

const RAW = (import.meta.env.VITE_API_MODE as string | undefined) ?? 'mock';
export const API_MODE: ApiMode = RAW === 'live' ? 'live' : 'mock';

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';

// Artificial latency for mock mode so loading states surface during development.
// 0 = instant. Bump to 200–500 to stress-test skeletons.
export const MOCK_LATENCY_MS: number = Number(
  (import.meta.env.VITE_MOCK_LATENCY_MS as string | undefined) ?? 0,
);
