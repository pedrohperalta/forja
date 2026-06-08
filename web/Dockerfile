FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY mobile/package.json mobile/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY web/package.json web/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm --filter @forja/domain build
RUN pnpm --filter @forja/web build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV UPLOADS_DIR=/data/uploads

RUN addgroup -S nodejs \
  && adduser -S nextjs -G nodejs \
  && mkdir -p /data/uploads \
  && chown -R nextjs:nodejs /app /data/uploads

COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "web/server.js"]
