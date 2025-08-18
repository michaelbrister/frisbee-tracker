FROM alpine:3.18

RUN apk add --no-cache bash curl

WORKDIR /app

# Copy PocketBase binary (put your compiled binary here)
COPY pocketbase .

RUN chmod +x pocketbase

# Copy pb_data folder with hooks, cron jobs, database, etc.
COPY pb_data ./pb_data

EXPOSE 8090

CMD ["./pocketbase", "serve", "--dir", "/app/pb_data"]
