# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY bff/package.json bff/package-lock.json* ./

RUN npm install --frozen-lockfile 2>/dev/null || npm install

# Copy TypeScript source
COPY bff/tsconfig.json ./
COPY bff/src ./src

# Build TypeScript -> dist/
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime

WORKDIR /app

# Install only production dependencies
COPY bff/package.json bff/package-lock.json* ./
RUN npm install --frozen-lockfile --omit=dev 2>/dev/null || npm install --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Copy proto files so proto-loader can resolve them at runtime
COPY proto /app/proto

# Runtime environment
ENV NODE_ENV=production \
    BFF_PORT=4000 \
    BFF_HOST=0.0.0.0 \
    DAPR_GRPC_PORT=50001 \
    PROTO_PATH=/app/proto \
    LOG_LEVEL=info

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/healthz || exit 1

CMD ["node", "dist/index.js"]
