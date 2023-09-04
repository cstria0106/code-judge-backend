# debian 12
FROM alpine:3

RUN apk add build-base
COPY ./gcc /app