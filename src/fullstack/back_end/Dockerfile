FROM node:20-alpine

WORKDIR /app/src/fullstack/back_end

ENV NODE_ENV=production

COPY src/fullstack/back_end/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY src/fullstack/back_end /app/src/fullstack/back_end

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "const http=require('http');const req=http.get('http://127.0.0.1:3000/health',res=>process.exit(res.statusCode===200?0:1));req.on('error',()=>process.exit(1));"

CMD ["sh", "./start.sh"]
