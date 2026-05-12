# syntax=docker/dockerfile:1.6

# ---- Builder ---------------------------------------------------------------
# better-sqlite3 ships a native binding that has to be compiled per platform,
# so we build inside a Debian image with the toolchain present.
FROM node:22-bookworm-slim AS builder
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 build-essential \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
# --omit=dev keeps the production image lean (tsx is in dependencies, so it stays).
RUN npm install --omit=dev --legacy-peer-deps

# ---- Runtime ---------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4001 \
    BULLEPIN_DATA_DIR=/data

# Copy production node_modules + source.
COPY --from=builder /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src

# Volume mount point.
RUN mkdir -p /data

EXPOSE 4001

CMD ["./node_modules/.bin/tsx", "src/index.ts"]
