FROM node:22.12.0-alpine AS development
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .



# # Stage de Build para Produção
# FROM node:22.12.0-alpine AS builder
# WORKDIR /usr/src/app
# COPY package*.json ./
# RUN npm install
# COPY . .
# RUN npm run build

# FROM node:22.12.0-alpine AS production
# WORKDIR /usr/src/app
# ENV NODE_ENV=production
# ENV PORT=4000

# COPY --from=builder /usr/src/app/.next ./.next
# COPY --from=builder /usr/src/app/public ./public
# COPY --from=builder /usr/src/app/package.json ./package.json

# RUN npm install --production
# EXPOSE 4000
# CMD ["npm", "start"]
