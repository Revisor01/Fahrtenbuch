FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG CORS_ORIGIN
ENV CORS_ORIGIN=$CORS_ORIGIN

EXPOSE 5000
CMD ["node", "app.js"]