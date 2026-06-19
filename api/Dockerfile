FROM node:24.14.0-alpine AS base
WORKDIR /usr/src/app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN npm ci

# ================= DEV =================
FROM base AS development
ENV NODE_ENV=development

COPY . .

# ================= BUILD =================
FROM base AS build
ENV NODE_ENV=production
COPY . .
RUN npm run build

# ================= PROD =================
FROM node:24.14.0-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production

RUN apk add --no-cache python3 make g++

COPY ./data ./data
COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /usr/src/app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
