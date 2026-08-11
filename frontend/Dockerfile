# Build stage
FROM node:20 as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Konfiguriert wird zur Laufzeit ueber docker-entrypoint.sh (config.js), nicht
# zur Build-Zeit — deshalb braucht der Build keine Argumente. Die Version aus
# package.json backt vite.config.js ein (Anzeige im Info-Dialog).
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY ./docker-entrypoint.sh /docker-entrypoint-fahrtenbuch.sh
RUN chmod +x /docker-entrypoint-fahrtenbuch.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint-fahrtenbuch.sh"]
CMD ["nginx", "-g", "daemon off;"]