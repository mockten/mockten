# Build stage
FROM node:lts AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . ./
# No keys are passed to the build on purpose. Vite inlines VITE_* into the bundle
# at build time, which would bake an environment-specific credential into the
# image; instead the storefront reads window.__APP_CONFIG__, which
# docker-entrypoint.sh renders from the environment at container start.
RUN npm run build:dev

# Execution Stage
FROM nginx:1.29.5-alpine3.23
COPY --from=build /app/dist /usr/share/nginx/html
COPY default.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint-mockten.sh
RUN chmod +x /docker-entrypoint-mockten.sh
EXPOSE 80
# Renders /config.js from the environment, then execs nginx.
ENTRYPOINT ["/docker-entrypoint-mockten.sh"]
