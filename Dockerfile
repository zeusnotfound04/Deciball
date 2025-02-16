# Copy package files and install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Build the Next.js application
RUN npm run build

# Expose application port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
