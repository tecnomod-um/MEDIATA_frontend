FROM node:18-bullseye-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps
COPY . .

ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}

ARG PUBLIC_URL=/
ENV PUBLIC_URL=${PUBLIC_URL}

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

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
