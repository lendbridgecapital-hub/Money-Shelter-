# Multi-stage build producing a small runtime image. Works on any Docker
# host — a VPS, Railway, Render, Fly.io, ECS, etc. See DEPLOYMENT.md.

FROM node:20-bookworm-slim AS deps
WORKDIR /app
# python3/make/g++ are a fallback in case better-sqlite3 has no prebuilt
# binary for this exact platform and needs to compile from source.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Dummy values so `next build` can run without a real .env present at build
# time — nothing here needs to be correct for the build step itself.
ENV NEXTAUTH_SECRET="build-time-placeholder"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV APP_BASE_URL="http://localhost:3000"
ENV DATABASE_FILE="./data/app.db"
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Next's standalone output only includes what it traces from imports — the
# schema is read from disk at runtime, so it must be copied explicitly.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/src/db/schema.sql ./src/db/schema.sql

# Data (SQLite file) and uploaded documents must live on a persistent
# volume — mount both in production or every redeploy wipes them.
RUN mkdir -p /app/data /app/public/uploads

EXPOSE 3000
CMD ["node", "server.js"]
