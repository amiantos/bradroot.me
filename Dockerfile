FROM node:20-alpine
RUN apk add --no-cache git openssh-client
RUN git config --global safe.directory /app
RUN git config --global user.name "Brad Root"
RUN git config --global user.email "bradroot@me.com"
WORKDIR /app/scripts
COPY scripts/package.json scripts/package-lock.json ./
RUN npm ci
CMD ["node", "server.js"]
