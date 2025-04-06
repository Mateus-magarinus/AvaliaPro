FROM node:22.12.0-alpine As development

WORKDIR /usr/src/app

COPY package.json ./

RUN npm install

COPY . .

RUN npm run build
