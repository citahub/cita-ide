FROM node:10 as build
WORKDIR /app
COPY package*.json ./
RUN npm --registry https://registry.npm.taobao.org install
COPY . .
RUN npm run build
FROM nginx:1.16.0
COPY --from=build /app/build /usr/share/nginx/html/build
COPY assets /usr/share/nginx/html/assets
COPY index.html /usr/share/nginx/html/index.html
COPY icon.png /usr/share/nginx/html/icon.png
COPY background.js /usr/share/nginx/html/background.js
COPY manifest.json /usr/share/nginx/html/manifest.json
COPY docker/nginx/nginx.conf /etc/nginx/conf.d/default.conf
