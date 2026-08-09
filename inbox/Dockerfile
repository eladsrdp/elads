FROM node:24-alpine
# sqlite CLI package (not the Node module — that's built into Node itself) for manual inspection via docker exec
RUN apk add --no-cache sqlite
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
