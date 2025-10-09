#!/bin/bash

# Quick Azure Deployment Commands
# Run these in your terminal where you're already logged in

set -e

# Configuration
RESOURCE_GROUP="realtime-translation-rg"
APP_SERVICE_PLAN="realtime-translation-plan"
APP_NAME="realtime-translation-sagiv"
LOCATION="germanywestcentral"
SKU="B1"

# Your API Keys
DEEPGRAM_KEY="your_deepgram_api_key_here"
DEEPL_KEY="your_deepl_api_key_here"
AZURE_SPEECH_KEY="your_azure_speech_key_here"
AZURE_SPEECH_REGION="germanywestcentral"

echo "========================================="
echo "Starting Azure Deployment"
echo "========================================="
echo ""

# Step 1: Create Resource Group
echo "Step 1/7: Creating Resource Group..."
az group create \
    --name "$RESOURCE_GROUP" \
    --location "$LOCATION"

echo ""
echo "Step 2/7: Creating App Service Plan..."
az appservice plan create \
    --name "$APP_SERVICE_PLAN" \
    --resource-group "$RESOURCE_GROUP" \
    --sku "$SKU" \
    --is-linux

echo ""
echo "Step 3/7: Creating Web App..."
az webapp create \
    --resource-group "$RESOURCE_GROUP" \
    --plan "$APP_SERVICE_PLAN" \
    --name "$APP_NAME" \
    --runtime "NODE:20-lts"

echo ""
echo "Step 4/7: Enabling WebSockets..."
az webapp config set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --web-sockets-enabled true

echo ""
echo "Step 5/7: Configuring Environment Variables..."
az webapp config appsettings set \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --settings \
        DEEPGRAM_API_KEY="$DEEPGRAM_KEY" \
        DEEPL_API_KEY="$DEEPL_KEY" \
        AZURE_SPEECH_KEY="your_azure_speech_key_here" \
        AZURE_SPEECH_REGION="$AZURE_SPEECH_REGION" \
        WEBSITE_NODE_DEFAULT_VERSION="~20" \
        SCM_DO_BUILD_DURING_DEPLOYMENT="true"

echo ""
echo "Step 6/7: Configuring deployment..."
az webapp deployment source config-local-git \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME"

echo ""
echo "Step 7/7: Deploying application..."
cd /Users/sagivstavinsky/realtime-translation-app
az webapp up \
    --resource-group "$RESOURCE_GROUP" \
    --name "$APP_NAME" \
    --runtime "NODE:20-lts"

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Your app is now available at:"
echo "https://$APP_NAME.azurewebsites.net"
echo ""
echo "Test the health endpoint:"
echo "https://$APP_NAME.azurewebsites.net/health"
echo ""
