# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Stage 2: Build Next.js (standalone output)
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js inlines NEXT_PUBLIC_* at build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_APP_NAME=SaaSGuard
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}

RUN npm run build

# Stage 3: Final minimal image (no node_modules needed — standalone bundles everything)
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3006
ENV HOSTNAME=0.0.0.0

# Security: non-root user
RUN addgroup -g 1001 -S saasguard && \
    adduser -S saasguard -u 1001

COPY --from=build --chown=saasguard:saasguard /app/.next/standalone ./
COPY --from=build --chown=saasguard:saasguard /app/.next/static ./.next/static
COPY --from=build --chown=saasguard:saasguard /app/public ./public

USER saasguard
EXPOSE 3006

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3006/login || exit 1

CMD ["node", "server.js"]
