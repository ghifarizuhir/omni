# syntax=docker/dockerfile:1.7
#
# OIS API server — multi-stage build.
#
# Stages:
#   deps     install all dependencies (incl. dev) for the build stage
#   build    run prisma generate + compile-time checks; SPA is built separately
#   runtime  minimal image with prod deps + generated Prisma client
#
# The SPA (Vite `dist/`) is NOT served by this container — per M7 strategy a
# separate static host (Caddy/NGINX) fronts the SPA. This image runs the
# Express API on :3001 only.
#
# TODO(M8): swap `tsx` runtime for a `tsc`-compiled JS bundle to drop the
# TypeScript toolchain from the runtime image.

ARG NODE_IMAGE=node:22-alpine

# ---------- Stage 1: deps ----------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app

# openssl + ca-certificates: Prisma 6 query-engine on alpine links against
# libssl at install/generate time. Without these `prisma generate` fails.
RUN apk add --no-cache openssl ca-certificates

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- Stage 2: build ----------
FROM ${NODE_IMAGE} AS build
WORKDIR /app

RUN apk add --no-cache openssl ca-certificates

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (writes into node_modules/.prisma + @prisma/client).
RUN npx prisma generate

# Prune dev dependencies for the runtime copy. Keep a separate node_modules
# tree so build-time tools (tsx, vite) stay isolated.
RUN npm prune --omit=dev

# ---------- Stage 3: runtime ----------
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app

RUN apk add --no-cache openssl ca-certificates wget

ENV NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0

# Copy pruned production deps (with generated Prisma client baked in).
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/package-lock.json ./package-lock.json
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/tsconfig.json ./tsconfig.json

# `tsx` lives in devDependencies; after pruning it's gone. Reinstall just the
# runtime TS loader (small) so we can run server/index.ts without compiling.
# TODO(M8): remove once we ship a `tsc`-compiled JS server.
RUN npm install --no-audit --no-fund --omit=optional tsx@^4.21.0

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q -O- http://localhost:3001/health || exit 1

CMD ["npx", "tsx", "server/index.ts"]
