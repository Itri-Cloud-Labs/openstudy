# Build context is the repository root, because the website is a Bun workspace:
#   docker build -f website/Dockerfile .

FROM oven/bun:1.3 AS build
WORKDIR /app

# Install only the website workspace so the TUI's dependencies stay out of the image.
COPY package.json bun.lock ./
COPY website/package.json website/package.json
RUN bun install --frozen-lockfile --filter openstudy-website

COPY website website
RUN bun run --cwd website build

FROM nginxinc/nginx-unprivileged:1.29-alpine AS runtime
COPY website/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/website/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
