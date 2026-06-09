FROM node:22-alpine
WORKDIR /app
RUN apk upgrade --no-cache
COPY package.json ./
RUN npm install --production
COPY index.js ./
EXPOSE 3000
CMD ["npm", "start"]
