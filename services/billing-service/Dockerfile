# ---------------------------------------------------------------------------
# Stage 1: Build
#
# Build context is the project root (set in docker-compose.yml) so that proto
# files from the top-level proto/ directory are accessible during the build.
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cache optimisation)
COPY services/billing-service/package.json services/billing-service/package-lock.json* ./
RUN npm install

# Copy TypeScript source
COPY services/billing-service/tsconfig.json ./
COPY services/billing-service/src/ ./src/

# Compile TypeScript to dist/
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Runtime
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runtime

WORKDIR /app

# Production dependencies only
COPY services/billing-service/package.json services/billing-service/package-lock.json* ./
RUN npm install --omit=dev

# Compiled JavaScript
COPY --from=builder /app/dist ./dist

# Proto files are needed at runtime so proto-loader can read them.
# They are placed at /app/proto so the resolver in src/index.ts finds them.
COPY proto/ ./proto/

# Non-root user for security hardening
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# gRPC port
EXPOSE 50051
# HTTP port for Dapr pub/sub event delivery
EXPOSE 3001

CMD ["node", "dist/index.js"]
