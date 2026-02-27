# ---- Stage 1: Build ----
# Build context is the repository root so proto files are accessible.
FROM node:20-alpine AS builder

WORKDIR /app

# Install openssl for Prisma binary compatibility on Alpine
RUN apk add --no-cache openssl

# Copy package files and install all dependencies (including devDeps for build)
COPY services/customer-service/package*.json ./
RUN npm install

# Copy Prisma schema and generate client (with musl binary target)
COPY services/customer-service/prisma ./prisma
RUN npx prisma generate

# Copy source and compile TypeScript
COPY services/customer-service/tsconfig.json ./
COPY services/customer-service/src ./src
RUN npm run build

# ---- Stage 2: Run ----
FROM node:20-alpine AS runner

WORKDIR /app

# Install openssl required by Prisma at runtime
RUN apk add --no-cache openssl

# Copy package files and install all deps (prisma CLI needed for migrate deploy)
COPY services/customer-service/package*.json ./
RUN npm install

# Copy Prisma schema + generated client from builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Copy proto files so the service can load them at runtime
COPY proto /proto

ENV PROTO_PATH=/proto
ENV NODE_ENV=production

EXPOSE 50051

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
