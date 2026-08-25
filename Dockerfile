FROM node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32 AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS production-deps
RUN npm prune --omit=dev

FROM base AS worker-deps
WORKDIR /runtime
COPY docker/worker-runtime/package.json docker/worker-runtime/package-lock.json ./
RUN npm ci --omit=dev

FROM base AS migrate-deps
WORKDIR /runtime
COPY docker/migrate-runtime/package.json docker/migrate-runtime/package-lock.json ./
RUN npm ci --omit=dev

FROM deps AS build
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
# Next evaluates route modules during the build. These placeholders exist only
# in this intermediate stage; real runtime configuration is injected by Compose.
ENV BETTER_AUTH_SECRET=e6758aacbac1db19559ebb7674cd8026
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DIRECT_URL=postgresql://build:build@localhost:5432/build
ENV REDIS_URL=redis://localhost:6379
COPY . .
RUN npm run build:worker && npm run build

FROM base AS web
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]

FROM base AS worker
WORKDIR /app
ENV NODE_ENV=production
COPY --from=worker-deps --chown=node:node /runtime/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist/worker ./dist/worker
USER node
CMD ["node", "dist/worker/index.js"]

FROM base AS migrate
WORKDIR /app
ENV NODE_ENV=production
COPY --from=migrate-deps --chown=node:node /runtime/node_modules ./node_modules
COPY --from=build --chown=node:node /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build --chown=node:node /app/src/db/schema ./src/db/schema
COPY --from=build --chown=node:node /app/drizzle ./drizzle
USER node
CMD ["./node_modules/.bin/drizzle-kit", "migrate", "--config=drizzle.config.ts"]

FROM migrate AS seed
COPY --from=build --chown=node:node /app/tsconfig.json ./tsconfig.json
COPY --from=build --chown=node:node /app/scripts/seed.ts ./scripts/seed.ts
COPY --from=build --chown=node:node /app/src/db/client.ts ./src/db/client.ts
USER node
CMD ["./node_modules/.bin/tsx", "scripts/seed.ts"]

FROM build AS verify-cache-worker
WORKDIR /app
ENV NODE_ENV=production
USER node
CMD ["./node_modules/.bin/tsx", "scripts/verify-cache-worker-flow.ts"]
