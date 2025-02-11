# Build stage
FROM node:20 as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV REACT_APP_TITLE=""
ENV REACT_APP_ALLOW_REGISTRATION=""
ENV REACT_APP_ALLOWED_EMAIL_DOMAINS=""
ENV REACT_APP_REGISTRATION_CODE=""

RUN npm run build

# Production stage
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]