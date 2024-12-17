# Use an official Node.js runtime with the specific version as a parent image
FROM node:20.10.0-alpine

# Set the working directory to the root directory
WORKDIR /

# Copy the package.json and package-lock.json files to the root directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code to the root directory
COPY . .

# Accept multiple build arguments for environment variables
ARG HELIUS_API_KEY
ARG MONGODB_URI

# Set the environment variables
ENV HELIUS_API_KEY=${HELIUS_API_KEY}
ENV MONGODB_URI=${MONGODB_URI}

# Build the Next.js application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the app
CMD ["npm", "start"]
