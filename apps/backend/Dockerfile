# Stage 1: Install ALL dependencies (needed for build)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps --ignore-scripts && \
    npm rebuild bcrypt

# Stage 2: Build TypeScript
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production dependencies only
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps --omit=dev --ignore-scripts && \
    npm rebuild bcrypt

# Stage 4: Final minimal image
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Security: non-root user
RUN addgroup -g 1001 -S saasguard && \
    adduser -S saasguard -u 1001

COPY --from=build --chown=saasguard:saasguard /app/dist ./dist
COPY --from=prod-deps --chown=saasguard:saasguard /app/node_modules ./node_modules
COPY --chown=saasguard:saasguard package.json ./

USER saasguard
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3005/health || exit 1

CMD ["node", "dist/main.js"]
