FROM node:22-alpine AS build
WORKDIR /app

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN pnpm prisma generate
RUN pnpm run build

FROM node:22-alpine AS run
ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache openssl

RUN npm install -g pnpm prisma
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --ignore-scripts
COPY . .
COPY --from=build /app/dist ./dist
RUN prisma generate
CMD pnpm run start:prod