FROM node:20-alpine
RUN apk add --no-cache git openssh-client
WORKDIR /app
COPY scripts/package.json scripts/package-lock.json ./
RUN npm ci
COPY scripts/ ./
COPY website/ /app/website/
CMD ["node", "server.js"]
