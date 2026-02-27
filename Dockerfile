FROM node:20-alpine

WORKDIR /app

# Install only backend dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy only the server folder (no frontend source needed)
COPY server/ ./server/

EXPOSE 8080

CMD ["node", "server/server.js"]
