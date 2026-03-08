# --- build stage
FROM golang:1.25 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY main.go .
# Build PB with SQLite JSON/FTS features (recommended flags)
RUN CGO_ENABLED=0 go build -tags "sqlite_fts5 sqlite_json" -o /out/pb

# --- runtime stage
FROM alpine:3.19
WORKDIR /app
COPY --from=build /out/pb /usr/local/bin/pb
COPY pb_data/pb_hooks ./pb_hooks
COPY pb_data/pb_migrations ./pb_migrations
VOLUME ["/app/pb_data"]
EXPOSE 8090
CMD ["pb", "serve", "--http=0.0.0.0:8090", "--hooksDir=./pb_hooks", "--migrationsDir=./pb_migrations"]
