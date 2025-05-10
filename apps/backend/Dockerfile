FROM node:20-alpine

WORKDIR /app

# Install bun
RUN apk add --no-cache unzip curl bash
RUN curl -fsSL https://bun.sh/install | bash

# Copy package files
COPY package.json .
COPY bun.lockb .

# Install dependencies
RUN /root/.bun/bin/bun install

# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["/root/.bun/bin/bun", "run", "start"]
