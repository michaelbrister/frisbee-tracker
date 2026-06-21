# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files first for better cache usage
COPY package*.json ./

# Now copy the rest of the source code
COPY . .

# Install dependencies (must be done before build)
RUN npm ci

# Build the Quasar SPA
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built SPA from builder stage
COPY --from=builder /app/dist/spa /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
