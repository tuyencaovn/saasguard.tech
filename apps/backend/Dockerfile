# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3005
CMD ["node", "dist/main.js"]
