# Build stage
FROM node:20 as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG REACT_APP_TITLE
ARG REACT_APP_ALLOW_REGISTRATION
ARG REACT_APP_ALLOWED_EMAIL_DOMAINS
ARG REACT_APP_REGISTRATION_CODE

ENV REACT_APP_TITLE=${REACT_APP_TITLE}
ENV REACT_APP_ALLOW_REGISTRATION=${REACT_APP_ALLOW_REGISTRATION}
ENV REACT_APP_ALLOWED_EMAIL_DOMAINS=${REACT_APP_ALLOWED_EMAIL_DOMAINS}
ENV REACT_APP_REGISTRATION_CODE=${REACT_APP_REGISTRATION_CODE}

# Version aus package.json in den Build einbacken (Anzeige im Info-Dialog)
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