// Builds the public webhook URL for an integration. The host is the app's
// canonical base; the path is the integration-specific suffix produced by the
// backend (e.g. "/integrations/webhook/abc").

const APP_BASE = 'https://ois.acme.io';

export const integrationWebhookUrl = (path: string) => `${APP_BASE}${path}`;
