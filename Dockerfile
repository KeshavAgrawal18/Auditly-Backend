# Build Stage
FROM node:18-alpine as builder

# Add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only necessary files first
COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig*.json ./
COPY .env.example ./.env

# Install all dependencies (including dev dependencies for the build step)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Run the build process (this will use TypeScript)
RUN npm run build

# Production Stage
FROM node:18-alpine

# Add non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy necessary files from the build stage
COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/package*.json ./
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=builder --chown=appuser:appgroup /app/.env ./

# Switch to non-root user
USER appuser

EXPOSE 4300

# Health check to verify if the API is healthy
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4300/health || exit 1

# Command to start the application
CMD ["npm", "start"]