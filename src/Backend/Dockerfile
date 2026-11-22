# syntax=docker/dockerfile:1
FROM node:24-alpine AS storefront
WORKDIR /app
COPY factionbikeworks/package.json factionbikeworks/package-lock.json ./
# Optional extra CA bundle for networks with TLS inspection (build secret, never stored in a layer).
RUN --mount=type=secret,id=npm_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca npm ci --no-audit --no-fund
COPY factionbikeworks/ .
# Site settings schema shared with the API (imported as ../../../shared from src/lib).
COPY shared/ /shared/
# Empty uses same-origin API and images.
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Faction Bikeworks API (Express 5 + Sequelize/MySQL).
FROM node:24-alpine AS deps
WORKDIR /app
COPY Backend/package.json Backend/package-lock.json ./
# Production deps only. Puppeteer is a devDependency (test report PDF), so no Chromium is pulled.
# Optional extra CA bundle for networks with TLS inspection (build secret, never stored in a layer).
RUN --mount=type=secret,id=npm_ca,required=false \
    NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM node:24-alpine
ENV NODE_ENV=production \
    PORT_SERVER=8000
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node Backend/ .
COPY --chown=node:node shared/ /shared/
COPY --from=storefront /app/build ./storefront
ENV SERVE_STOREFRONT=true
# Uploaded product/banner/brand images are written here at runtime; compose mounts a volume
# on it (seeded from the image's bundled images on first start).
RUN mkdir -p images && chown -R node:node images
USER node
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT_SERVER}/api/health" >/dev/null || exit 1
CMD ["node", "server.js"]
