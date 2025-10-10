# Multi-stage build for security and smaller final image

# Stage 1: Build stage with dev dependencies
FROM node:20-alpine AS builder

# Install security updates and build tools
RUN apk update && apk upgrade && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for TypeScript)
RUN npm ci && npm cache clean --force

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/
COPY prompts/ ./prompts/

# Build TypeScript
RUN npm run build

# Stage 2: Production stage with minimal dependencies
FROM node:20-alpine AS production

# Install security updates and runtime tools
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S familyoffice -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=familyoffice:nodejs package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built JavaScript files from build stage
COPY --from=builder --chown=familyoffice:nodejs /app/dist/ ./dist/

# Copy prompts directory (needed at runtime)
COPY --chown=familyoffice:nodejs prompts/ ./prompts/

# Create directories for outputs with proper permissions  
RUN mkdir -p /app/reports /app/logs /app/.codex /home/familyoffice && \
    chown -R familyoffice:nodejs /app/reports /app/logs /app/.codex /home/familyoffice

# Security hardening (ensure proper ownership and permissions)
RUN chown -R familyoffice:nodejs /app && \
    find /app -type d -exec chmod 755 {} \; && \
    find /app -type f -name "*.js" -exec chmod 644 {} \; && \
    find /app -type f -name "*.json" -exec chmod 644 {} \; && \
    find /app -type f -name "*.md" -exec chmod 644 {} \; && \
    chmod +x /app/dist/cli.js && \
    chmod +x /app/node_modules/@openai/codex-sdk/vendor/*/codex/* 2>/dev/null || true

# Switch to non-root user
USER familyoffice

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node --version || exit 1

# Use dumb-init to handle signals properly and run the CLI
ENTRYPOINT ["dumb-init", "--", "node", "dist/cli.js"]

# Default command (will be appended to ENTRYPOINT)
CMD []
