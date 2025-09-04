# scheduler/Dockerfile
FROM node:20-alpine

RUN apk add --no-cache tzdata bash
ENV TZ=America/New_York

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY cron-frisbee.mjs ./

# Run every hour at minute 5 (gives PB time to start on reboots)
RUN echo '5 * * * * node /app/cron-frisbee.mjs >> /var/log/cron-frisbee.log 2>&1' > /etc/crontabs/root

# Start cron in foreground
CMD [ "crond", "-f", "-l", "2" ]
