# Imagen única para los tres microservicios de Cine Atlántico.
# Cada servicio de docker-compose.yml la usa con un comando distinto.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY servicios ./servicios
CMD ["node", "servicios/boletos/server.js"]
