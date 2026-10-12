FROM node:lts
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 8001
CMD ["npm", "start"]