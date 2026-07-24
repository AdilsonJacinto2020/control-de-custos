FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# --- development (hot-reload, source mounted via docker-compose volume) ---
FROM base AS dev
RUN npm install
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# --- production ---
FROM base AS build
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
