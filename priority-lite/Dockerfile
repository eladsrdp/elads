FROM node:20-alpine
# better-sqlite3 is a native module — needs build tools
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
COPY shared/package*.json shared/
COPY server/package*.json server/
COPY client/package*.json client/
RUN npm ci
COPY . .
# Build the React client (output → client/dist)
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
