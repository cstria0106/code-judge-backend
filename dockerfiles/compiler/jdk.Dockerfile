# debian 12
FROM alpine:3

RUN apk update && apk add openjdk17
COPY ./jdk /app