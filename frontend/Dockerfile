# Build stage
FROM node:26 as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Konfiguration erst zur Laufzeit über docker-entrypoint.sh, der Build braucht keine Argumente.
RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
# Getrennt, weil jeder location-Block sie einzeln einbinden muss.
COPY ./security-headers.conf /etc/nginx/security-headers.conf
COPY ./docker-entrypoint.sh /docker-entrypoint-fahrtenbuch.sh
RUN chmod +x /docker-entrypoint-fahrtenbuch.sh
EXPOSE 80
ENTRYPOINT ["/docker-entrypoint-fahrtenbuch.sh"]
CMD ["nginx", "-g", "daemon off;"]