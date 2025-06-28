FROM ghcr.io/puppeteer/puppeteer:latest

# Set working directory
WORKDIR /app

# ✅ Copy and assign correct owner in one step
COPY --chown=pptruser:pptruser . .

# Use the non-root user Puppeteer image expects
USER pptruser

# Install dependencies
RUN npm install

# Run your script
CMD ["node", "scrape.js"]
