#!/bin/bash

# Deployment script for Azure App Service

# Exit on error
set -e

echo "Starting deployment..."

# Install dependencies
echo "Installing Node.js dependencies..."
npm install --production

echo "Deployment complete!"
