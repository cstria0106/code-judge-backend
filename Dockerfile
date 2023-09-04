FROM node:18-alpine AS BUILD
WORKDIR /app

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN pnpm prisma generate
RUN pnpm run build

FROM node:18-alpine AS RUN
ENV NODE_ENV production
WORKDIR /app

RUN npm install -g pnpm prisma
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --ignore-scripts
COPY . .
COPY --from=BUILD /app/dist ./dist
RUN prisma generate
CMD pnpm run start:prod