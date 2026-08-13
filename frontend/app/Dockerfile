# Build stage — context must be the monorepo root.
FROM node:22-alpine AS build

WORKDIR /app
COPY packages/design-tokens packages/design-tokens
COPY packages/design-system-ui packages/design-system-ui
COPY frontend/app/package*.json frontend/app/
WORKDIR /app/frontend/app
RUN npm ci
COPY frontend/app/ .

ARG VITE_BASE_PATH=/app/
ARG VITE_API_BASE_URL=
ENV VITE_BASE_PATH=$VITE_BASE_PATH VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY frontend/app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/app/dist /usr/share/nginx/html
EXPOSE 80
