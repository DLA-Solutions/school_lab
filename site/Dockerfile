# Build stage — context must be the monorepo root.
# The image produces site/dist itself. GitHub Actions does not run Vite before Kamal.
FROM node:22-alpine AS build

WORKDIR /app
COPY site/package.json site/package-lock.json site/
WORKDIR /app/site
RUN npm ci
COPY site/ .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY site/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/site/dist /usr/share/nginx/html
EXPOSE 80
