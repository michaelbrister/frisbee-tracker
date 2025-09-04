# Frisbee Tracker (frisbee-tracker)

Ultimate Frisbee League tracker app built with Vue.js and Quasar.
Backend is a PocketBase instance.

Built with [Quasar v2](https://quasar.dev).
Build with [pocketbase](https://github.com/pocketbase/pocketbase).
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

Build and run the Docker image:

```bash
docker-compose up --build
```

Run the Docker image in the background:

```bash
docker-compose up -d
```

Build the frisbee-tracker Docker image:

```bash
docker build -t frisbee-tracker .
docker build -t frisbee-tracker-pocketbase -f Dockerfile-Pocketbase .
```

Run the frisbee-tracker Docker image:

```bash
docker run -p 8080:80 frisbee-tracker
```

Run the PocketBase Docker image:

```bash
docker run -p 8090:8090 -v pb_data:/pb_data frisbee-tracker-pocketbase
```

Access URLs
| Service | URL | Notes |
| --------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------- |
| Traefik Dashboard | [https://traefik.127.0.0.1.nip.io/dashboard/](https://traefik.127.0.0.1.nip.io/dashboard/) | Basic auth: `admin` / `admin` |
| Frontend SPA | [https://frontend.127.0.0.1.nip.io](https://frontend.127.0.0.1.nip.io) | Secured via Let's Encrypt |
| Backend API | [https://backend.127.0.0.1.nip.io/api](https://backend.127.0.0.1.nip.io/api) | Secured via Let's Encrypt |
| Backend Dashboard | [https://backend.127.0.0.1.nip.io/\_/](https://backend.127.0.0.1.nip.io/_/) | PocketBase admin UI |
| Direct frontend (dev only) | [http://localhost:9000](http://localhost:9000) | Bypasses Traefik |
| Direct backend (dev only) | [http://localhost:8090](http://localhost:8090) | Bypasses Traefik |
| Traefik dashboard HTTP (dev only) | [http://localhost:8080](http://localhost:8080) | Redirects to HTTPS dashboard |
