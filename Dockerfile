FROM node:22-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN mkdir -p public/css public/js && npm install

# Copy source
COPY . .

EXPOSE 8080

CMD ["node", "./bin/www"]
