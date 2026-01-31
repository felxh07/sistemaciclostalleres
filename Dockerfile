FROM node:18-alpine

WORKDIR /app

# Copy root package files
COPY package*.json ./

# Install root dependencies
RUN npm install

# Copy client package files
COPY client/package*.json ./client/

# Install client dependencies
RUN cd client && npm install

# Copy all source code
COPY . .

# Build client
RUN cd client && npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
