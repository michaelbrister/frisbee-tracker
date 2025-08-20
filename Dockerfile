# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and yarn.lock first for better cache usage
COPY package*.json yarn.lock* ./

# Now copy the rest of the source code
COPY . .

# Install dependencies (must be done before build)
RUN yarn install

# Build the Quasar SPA using local CLI via yarn run
RUN yarn run quasar build -m spa

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built SPA from builder stage
COPY --from=builder /app/dist/spa /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
