FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# --- development (hot-reload, source mounted via docker-compose volume) ---
FROM base AS dev
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# --- production ---
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]
