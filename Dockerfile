# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Build NestJS app
RUN npm run build

# Expose port 8080 (Cloud Run default)
EXPOSE 8080

# Start the app
CMD ["node", "dist/main.js"]
