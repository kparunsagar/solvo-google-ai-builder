# Multi-stage production build for Sagara Local Services Backend (Zone 3 & 6)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

COPY package*.json ./
RUN npm ci --only=production --no-audit && npm cache clean --force

COPY --from=builder --chown=nodeuser:nodejs /app/dist ./dist
RUN mkdir -p /app/data && chown -R nodeuser:nodejs /app/data

USER nodeuser

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/healthz || exit 1

CMD ["node", "dist/server.js"]
