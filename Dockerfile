FROM nginx:latest
COPY nginx.conf /etc/nginx/nginx.conf
COPY dist/ .
RUN mv /tree-maps-ng/* /usr/share/nginx/html

EXPOSE 80