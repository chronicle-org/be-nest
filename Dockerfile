## Stage 1: Builder
# Use a Node.js image for building, which includes development tools
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies required for 'nest build')
RUN npm install

# Copy source code and run the build
COPY . .
RUN npm run build

## ---

## Stage 2: Production
# Use a small, secure base image for the final production environment
FROM node:20-alpine AS production

# Set working directory
WORKDIR /usr/src/app

# Copy only production files from the builder stage
# 1. Copy package files (needed to figure out which production dependencies to install)
COPY package*.json ./

# 2. Install ONLY production dependencies in the final image
RUN npm install --omit=dev

# 3. Copy the built application code
COPY --from=builder /usr/src/app/dist ./dist

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Start the app
CMD ["node", "dist/main.js"]