#!/bin/bash

# Azure Deployment Script
# This script automates deployment to Azure App Service

set -e

echo "🚀 Starting Azure deployment..."

# Variables - UPDATE THESE
RESOURCE_GROUP="monitoring-rg"
APP_NAME="monitoring-system"
LOCATION="eastus"
SKU="B1"  # Basic tier, change to P1V2 for production

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Login to Azure
echo "🔐 Logging in to Azure..."
az login

# Create resource group if it doesn't exist
echo "📦 Creating resource group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create App Service plan
echo "📋 Creating App Service plan..."
az appservice plan create \
  --name ${APP_NAME}-plan \
  --resource-group $RESOURCE_GROUP \
  --sku $SKU \
  --is-linux

# Create Web App
echo "🌐 Creating Web App..."
az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan ${APP_NAME}-plan \
  --name $APP_NAME \
  --runtime "NODE:18-lts"

# Configure environment variables
echo "⚙️  Configuring environment variables..."
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --settings \
    NEXT_PUBLIC_API_URL="https://20.170.155.53:8080" \
    NODE_ENV="production"

# Deploy from local directory
echo "📤 Deploying application..."
az webapp up \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --runtime "NODE:18-lts"

# Get the URL
APP_URL=$(az webapp show --resource-group $RESOURCE_GROUP --name $APP_NAME --query defaultHostName -o tsv)

echo "✅ Deployment complete!"
echo "🌍 Your app is available at: https://${APP_URL}"
