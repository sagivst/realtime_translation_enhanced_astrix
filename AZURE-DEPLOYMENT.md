# Azure Deployment Guide

This guide will help you deploy the Realtime Translation App to Azure App Service.

## Prerequisites

1. **Azure Account** - Sign up at https://portal.azure.com
2. **Azure CLI** - Install from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli
3. **API Keys**:
   - Deepgram API Key (for Speech-to-Text)
   - DeepL API Key (for Translation)
   - Azure Speech Service Key and Region (for Text-to-Speech)

## Deployment Steps

### Option 1: Deploy via Azure CLI (Recommended)

1. **Login to Azure**
   ```bash
   az login
   ```

2. **Create a Resource Group**
   ```bash
   az group create --name realtime-translation-rg --location eastus
   ```

3. **Create an App Service Plan**
   ```bash
   az appservice plan create \
     --name realtime-translation-plan \
     --resource-group realtime-translation-rg \
     --sku B1 \
     --is-linux
   ```

4. **Create the Web App**
   ```bash
   az webapp create \
     --resource-group realtime-translation-rg \
     --plan realtime-translation-plan \
     --name realtime-translation-app-[YOUR-UNIQUE-NAME] \
     --runtime "NODE|20-lts"
   ```

5. **Configure App Settings (Environment Variables)**
   ```bash
   az webapp config appsettings set \
     --resource-group realtime-translation-rg \
     --name realtime-translation-app-[YOUR-UNIQUE-NAME] \
     --settings \
       DEEPGRAM_API_KEY="your-deepgram-key" \
       DEEPL_API_KEY="your-deepl-key" \
       AZURE_SPEECH_KEY="your-azure-speech-key" \
       AZURE_SPEECH_REGION="your-azure-region" \
       WEBSITE_NODE_DEFAULT_VERSION="~20" \
       SCM_DO_BUILD_DURING_DEPLOYMENT="true"
   ```

6. **Enable WebSockets**
   ```bash
   az webapp config set \
     --resource-group realtime-translation-rg \
     --name realtime-translation-app-[YOUR-UNIQUE-NAME] \
     --web-sockets-enabled true
   ```

7. **Deploy the Application**
   ```bash
   # From the project root directory
   az webapp up \
     --resource-group realtime-translation-rg \
     --name realtime-translation-app-[YOUR-UNIQUE-NAME] \
     --runtime "NODE|20-lts"
   ```

### Option 2: Deploy via Git

1. **Create the App Service** (follow steps 1-6 above)

2. **Configure Git Deployment**
   ```bash
   az webapp deployment source config-local-git \
     --resource-group realtime-translation-rg \
     --name realtime-translation-app-[YOUR-UNIQUE-NAME]
   ```

3. **Get Deployment Credentials**
   ```bash
   az webapp deployment list-publishing-credentials \
     --resource-group realtime-translation-rg \
     --name realtime-translation-app-[YOUR-UNIQUE-NAME]
   ```

4. **Add Azure as Git Remote**
   ```bash
   git remote add azure <deployment-url-from-previous-step>
   ```

5. **Push to Azure**
   ```bash
   git push azure main
   ```

### Option 3: Deploy via VS Code

1. Install the **Azure App Service** extension in VS Code
2. Sign in to your Azure account
3. Right-click on the `conference-server.js` file
4. Select **Deploy to Web App...**
5. Follow the prompts to create or select an App Service
6. Configure environment variables in the Azure Portal

## Post-Deployment Configuration

### Set Environment Variables in Azure Portal

1. Go to the Azure Portal (https://portal.azure.com)
2. Navigate to your App Service
3. Go to **Settings** → **Configuration**
4. Add the following Application Settings:
   - `DEEPGRAM_API_KEY`: Your Deepgram API key
   - `DEEPL_API_KEY`: Your DeepL API key
   - `AZURE_SPEECH_KEY`: Your Azure Speech Service key
   - `AZURE_SPEECH_REGION`: Your Azure Speech Service region (e.g., "eastus")
   - `PORT`: 8080 (or leave default)

5. Click **Save**

### Enable WebSockets

1. In the Azure Portal, go to your App Service
2. Navigate to **Settings** → **Configuration**
3. Under **General settings**, turn **Web sockets** to **On**
4. Click **Save**

## Testing the Deployment

Once deployed, your app will be available at:
```
https://realtime-translation-app-[YOUR-UNIQUE-NAME].azurewebsites.net
```

Test the application:
1. Open the URL in two different browsers or devices
2. Enter a username and select your language
3. Use the same Room ID for both clients
4. Click "Join Conference"
5. Start speaking and verify the translation appears on the other client

## Monitoring and Logs

### View Application Logs
```bash
az webapp log tail \
  --resource-group realtime-translation-rg \
  --name realtime-translation-app-[YOUR-UNIQUE-NAME]
```

### Enable Application Insights (Optional)
```bash
az monitor app-insights component create \
  --app realtime-translation-insights \
  --location eastus \
  --resource-group realtime-translation-rg

az webapp config appsettings set \
  --resource-group realtime-translation-rg \
  --name realtime-translation-app-[YOUR-UNIQUE-NAME] \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="[connection-string]"
```

## Troubleshooting

### Common Issues

1. **WebSockets not working**: Ensure WebSockets are enabled in App Service settings
2. **API keys not working**: Verify environment variables are set correctly in Configuration
3. **502 Bad Gateway**: Check application logs for errors, ensure Node.js version is compatible
4. **Audio not playing**: Check browser console for errors, verify HTTPS is being used

### Check Health Endpoint
```
https://your-app-name.azurewebsites.net/health
```

This should return:
```json
{
  "status": "ok",
  "services": {
    "deepgram": true,
    "deepl": true,
    "azure": true
  },
  "activeRooms": 0,
  "activeParticipants": 0
}
```

## Scaling

To scale your application:

```bash
# Scale up (more powerful instance)
az appservice plan update \
  --name realtime-translation-plan \
  --resource-group realtime-translation-rg \
  --sku P1V2

# Scale out (more instances)
az appservice plan update \
  --name realtime-translation-plan \
  --resource-group realtime-translation-rg \
  --number-of-workers 2
```

## Cleanup

To delete all resources:

```bash
az group delete \
  --name realtime-translation-rg \
  --yes --no-wait
```

## Cost Optimization

- Use **B1** (Basic) tier for development/testing (~$13/month)
- Use **S1** (Standard) tier for production (~$70/month)
- Enable **Auto-scale** based on CPU/memory metrics
- Monitor API usage for Deepgram, DeepL, and Azure Speech Services

## Support

For issues specific to:
- **Azure deployment**: Check Azure documentation
- **Application issues**: Check the application logs
- **API issues**: Verify your API keys and service quotas
