# Build stage — context must be the monorepo root.
FROM node:22-alpine AS build

WORKDIR /app
COPY packages/design-tokens packages/design-tokens
COPY frontend/package*.json frontend/
WORKDIR /app/frontend
RUN npm ci
# package-lock resolves design-tokens via ../../packages (legacy path); in Docker the monorepo
# root is /app, so relink to ../packages/design-tokens before the production build.
RUN rm -rf node_modules/@school-lab/design-tokens \
  && npm install --no-save file:../packages/design-tokens
COPY frontend/ .

ARG VITE_BASE_PATH=/app/
ARG VITE_API_BASE_URL=
ENV VITE_BASE_PATH=$VITE_BASE_PATH VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 80
