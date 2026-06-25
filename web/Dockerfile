FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY mobile/package.json mobile/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY web/package.json web/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

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
ENV FORJA_MOBILE_BUILD_OUTPUT_DIR=/data/mobile-builds
ENV FORJA_MOBILE_BUILD_REPO_DIR=/repo
ENV FORJA_MOBILE_BUILD_SCRIPT=/repo/build-apk.sh

RUN apk add --no-cache bash docker-cli docker-cli-buildx \
  && addgroup -S nodejs \
  && adduser -S nextjs -G nodejs \
  && addgroup -S docker \
  && adduser nextjs docker \
  && mkdir -p /data/uploads /data/mobile-builds \
  && chown -R nextjs:nodejs /app /data/uploads /data/mobile-builds

COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/web/public ./web/public

USER nextjs
EXPOSE 3000

CMD ["node", "web/server.js"]
