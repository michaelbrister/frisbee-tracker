# Frisbee Tracker (frisbee-tracker)

Ultimate Frisbee League tracker app built with Vue.js and Quasar.
Backend is a PocketBase instance.

Built with [Quasar v2](https://quasar.dev).
Build with [pocketbase-js](https://github.com/pocketbase/pocketbase-js).
PocketBase v0.29.2

## Install the dependencies

```bash
yarn
# or
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)

```bash
quasar dev
```

### Lint the files

```bash
yarn lint
# or
npm run lint
```

### Format the files

```bash
yarn format
# or
npm run format
```

### Build the app for production

```bash
quasar build
```

### Customize the configuration

See [Configuring quasar.config.js](https://v2.quasar.dev/quasar-cli-vite/quasar-config-js).

### Docker

#### Docker Compose

Replace your-email@example.com and yourdomain.com with your real email and domain.

Your PocketBase API will be accessible at https://yourdomain.com/api/...

Your Quasar frontend SPA will be accessible at https://yourdomain.com/

Put your PocketBase binary in pocketbase/pocketbase before building

Make sure pb_data/hooks/crons.js (with your cron logic) is inside the pocketbase/pb_data/hooks folder

Traefik automatically provisions Let's Encrypt TLS certificates

Build the Docker image:

```bash
docker build -t frisbee-tracker .
docker build -t frisbee-tracker-pocketbase -f Dockerfile-Pocketbase .
```

Run the Docker image:

```bash
docker run -p 8080:80 frisbee-tracker
```

```bash
docker run -p 8090:8090 -v pb_data:/pb_data frisbee-tracker-pocketbase
```

```bash
docker-compose up -d
```

```bash
docker-compose up --build
```
