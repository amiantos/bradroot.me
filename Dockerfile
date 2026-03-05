FROM node:20-alpine
RUN apk add --no-cache git openssh-client
RUN git config --global safe.directory /app
WORKDIR /app
ENTRYPOINT ["/app/scripts/entrypoint.sh"]
