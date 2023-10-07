
FROM node:18-alpine as build-step

RUN mkdir -p /app

WORKDIR /app

COPY package.json /app
RUN npm install
COPY . /app

RUN npm install -g @angular/cli
RUN npm run build --prod

FROM nginx:1.16.0-alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build-step /app/dist/tree-maps-ng /usr/share/nginx/html

ENV BEHOST=backend

ENTRYPOINT ["/bin/sh" , "-c" , "sed -i 's/BEHOST/'\"$BEHOST\"'/g' /etc/nginx/nginx.conf && exec nginx -g 'daemon off;'"]

EXPOSE 80