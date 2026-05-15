FROM nginx:alpine

COPY src/fullstack/front_end/nginx.conf /etc/nginx/conf.d/default.conf
COPY src/fullstack/front_end/proxy_params.conf /etc/nginx/conf.d/proxy_params.conf
COPY src/fullstack/front_end /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
