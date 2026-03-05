FROM node:20-alpine
RUN apk add --no-cache git openssh-client
RUN git config --global safe.directory /app
WORKDIR /app/scripts
COPY scripts/package.json scripts/package-lock.json ./
RUN npm ci
CMD ["node", "server.js"]
