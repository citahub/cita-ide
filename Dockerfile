FROM node:10 as build
WORKDIR /app
COPY . .
RUN npm --registry https://registry.npm.taobao.org install && npm run build
FROM nginx:1.16.0
COPY --from=build /app/build /usr/share/nginx/html/build
COPY assets /usr/share/nginx/html/assets
COPY index.html /usr/share/nginx/html/index.html
COPY icon.png /usr/share/nginx/html/icon.png
COPY nginx.conf /etc/nginx/conf.d/default.conf