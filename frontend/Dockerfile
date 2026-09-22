# Vibe Strike frontend — Vite build + nginx
FROM node:25-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# Override at build time, e.g. --build-arg VITE_API_URL=https://api.example.com
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Unprivileged nginx runs as a non-root user (uid 101) and listens on 8080
# by default — fixes Trivy AVD-DS-0002 without extra config juggling.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# apk upgrade patches base-image CVEs (openssl/c-ares etc.) that fail the
# container scan; run it as root, then drop back to the non-root user.
USER root
RUN apk upgrade --no-cache
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER 101

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
