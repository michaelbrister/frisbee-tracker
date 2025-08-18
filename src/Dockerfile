# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json yarn.lock* ./
RUN yarn install

COPY . .
RUN yarn quasar build -m spa

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist/spa /usr/share/nginx/html

# Optional: copy custom nginx config if needed
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
