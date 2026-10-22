# --- Stage 1: Build ----------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (including devDeps needed for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and config files
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client then compile TypeScript
RUN npx prisma generate && npm run build

# --- Stage 2: Production -----------------------------------------------------
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy Prisma schema + generated client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY prisma ./prisma

# Copy compiled output
COPY --from=builder /app/dist ./dist

# HuggingFace Spaces requires port 7860
ENV PORT=7860
EXPOSE 7860

# Startup script: resolves all migrations as applied, then deploy + start
COPY startup.sh ./startup.sh
RUN chmod +x ./startup.sh
CMD ["sh", "startup.sh"]