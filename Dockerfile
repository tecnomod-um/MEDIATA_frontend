FROM node:22-bullseye-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

ARG VITE_BASE_PATH=/mediata/
ENV VITE_BASE_PATH=${VITE_BASE_PATH}

RUN npm run build -- --base=${VITE_BASE_PATH}

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

RUN printf '%s\n' \
  '#!/bin/sh' \
  'echo "================================================"' \
  'echo "MEDIATA Frontend - Nginx Startup"' \
  'echo "================================================"' \
  'nginx -g "daemon off;"' \
  > /docker-entrypoint.sh \
  && chmod +x /docker-entrypoint.sh

EXPOSE 80
CMD ["/docker-entrypoint.sh"]