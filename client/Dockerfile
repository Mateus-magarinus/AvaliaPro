# ---- DEV ----
FROM node:22.12.0-alpine AS development
WORKDIR /usr/src/app
ENV NODE_ENV=development
# hot reload em host/WSL/mac
ENV WATCHPACK_POLLING=true
ENV CHOKIDAR_USEPOLLING=1

COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- BUILD ----
FROM node:22.12.0-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- PRODUCTION ----
FROM node:22.12.0-alpine AS production
WORKDIR /usr/src/app
ENV NODE_ENV=production
ENV PORT=3000

# copia artefatos do build e deps
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
