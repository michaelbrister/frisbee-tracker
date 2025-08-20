FROM alpine:3.18

RUN apk add --no-cache bash curl

WORKDIR /app

COPY pocketbase_amd64 ./pocketbase
RUN chmod +x pocketbase

COPY pb_data ./pb_data

EXPOSE 8090

CMD ["./pocketbase", "serve", "--http", "0.0.0.0:8090", "--dir", "/app/pb_data"]
