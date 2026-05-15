import request from 'supertest';
import type { Express } from 'express';
import { SESSION_COOKIE } from '../auth/session';

// Performs a login and returns the raw `Cookie` header value other requests
// can attach with `.set('Cookie', cookie)`.
export const login = async (app: Express, email: string, password: string): Promise<string> => {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) throw new Error('no set-cookie on login response');
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  const sid = cookies.find(c => c.startsWith(`${SESSION_COOKIE}=`));
  if (!sid) throw new Error('session cookie not found');
  return sid.split(';')[0];
};

// Credentials match the dev seed (prisma/seed.ts): admin@omni.local / demo.
export const ADMIN_EMAIL = 'admin@omni.local';
export const ADMIN_PASSWORD = 'demo';
