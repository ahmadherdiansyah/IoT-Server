FROM node:22-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

EXPOSE 8080

CMD ["node", "./bin/www"]
