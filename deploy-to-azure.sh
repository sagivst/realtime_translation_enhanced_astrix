#!/bin/bash

# Azure Deployment Script for Realtime Translation App
# This script automates the deployment process to Azure App Service

set -e  # Exit on error

echo "========================================="
echo "Azure Deployment Script"
echo "Realtime Translation App"
echo "========================================="
echo ""

# Configuration
RESOURCE_GROUP="realtime-translation-rg"
APP_SERVICE_PLAN="realtime-translation-plan"
LOCATION="eastus"
SKU="B1"  # Basic tier

# Prompt for app name
read -p "Enter a unique name for your app (e.g., my-translation-app): " APP_NAME
if [ -z "$APP_NAME" ]; then
    echo "Error: App name cannot be empty"
    exit 1
fi

FULL_APP_NAME="realtime-translation-$APP_NAME"

echo ""
echo "Configuration:"
echo "  Resource Group: $RESOURCE_GROUP"
echo "  App Service Plan: $APP_SERVICE_PLAN"
echo "  App Name: $FULL_APP_NAME"
echo "  Location: $LOCATION"
echo "  SKU: $SKU"
echo ""

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "Error: Azure CLI is not installed"
    echo "Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if logged in
echo "Checking Azure login status..."
if ! az account show &> /dev/null; then
    echo "Not logged in. Logging in to Azure..."
    az login
else
    echo "Already logged in to Azure"
fi

echo ""
read -p "Do you want to proceed with deployment? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled"
    exit 0
fi

echo ""
echo "Step 1: Creating Resource Group..."
az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --output table

echo ""
echo "Step 2: Creating App Service Plan..."
az appservice plan create \
    --name "$APP_SERVICE_PLAN" \
    --resource-group "$RESOURCE_GROUP" \
    --sku "$SKU" \
    --is-linux \
    --output table

echo ""
echo "Step 3: Creating Web App..."
az webapp create \
    --resource-group "$RESOURCE_GROUP" \
    --plan "$APP_SERVICE_PLAN" \
    --name "$FULL_APP_NAME" \
    --runtime "NODE|20-lts" \
    --output table

echo ""
echo "Step 4: Enabling WebSockets..."
az webapp config set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FULL_APP_NAME" \
    --web-sockets-enabled true \
    --output table

echo ""
echo "Step 5: Configuring Environment Variables..."
echo "Please enter your API keys:"

read -p "Deepgram API Key: " DEEPGRAM_KEY
read -p "DeepL API Key: " DEEPL_KEY
read -p "Azure Speech Service Key: " AZURE_SPEECH_KEY
read -p "Azure Speech Service Region (e.g., eastus): " AZURE_SPEECH_REGION

az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FULL_APP_NAME" \
    --settings \
        DEEPGRAM_API_KEY="$DEEPGRAM_KEY" \
        DEEPL_API_KEY="$DEEPL_KEY" \
        AZURE_SPEECH_KEY="$AZURE_SPEECH_KEY" \
        AZURE_SPEECH_REGION="$AZURE_SPEECH_REGION" \
        WEBSITE_NODE_DEFAULT_VERSION="~20" \
        SCM_DO_BUILD_DURING_DEPLOYMENT="true" \
    --output table

echo ""
echo "Step 6: Deploying Application..."
az webapp up \
    --resource-group "$RESOURCE_GROUP" \
    --name "$FULL_APP_NAME" \
    --runtime "NODE|20-lts"

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Your app is available at:"
echo "https://$FULL_APP_NAME.azurewebsites.net"
echo ""
echo "To view logs:"
echo "az webapp log tail --resource-group $RESOURCE_GROUP --name $FULL_APP_NAME"
echo ""
echo "To check health:"
echo "curl https://$FULL_APP_NAME.azurewebsites.net/health"
echo ""
echo "To delete all resources:"
echo "az group delete --name $RESOURCE_GROUP --yes --no-wait"
echo ""
