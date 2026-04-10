# Nginx image
FROM nginx:alpine

# frontend files
COPY . /usr/share/nginx/html

# Expose port 80 for web traffic
EXPOSE 80

# front desk start Nginx
CMD ["nginx", "-g", "daemon off;"]