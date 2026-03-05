FROM node:20-alpine
RUN apk add --no-cache git openssh-client
RUN printf '[safe]\n\tdirectory = /app\n[user]\n\tname = Brad Root\n\temail = bradroot@me.com\n' > /root/.gitconfig
WORKDIR /app/scripts
COPY scripts/package.json scripts/package-lock.json ./
RUN npm ci
CMD ["node", "server.js"]
