# Azure Deployment Guide

This guide will help you deploy the Monitoring System to Azure under the path `/3333_4444__Operational/public/Monitoring_Dashboard/`.

## Prerequisites

1. **Azure Account**: Sign up at [portal.azure.com](https://portal.azure.com)
2. **Azure CLI**: Install from [here](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
3. **Git**: Ensure your code is in a Git repository

## Important: web.config File

The project includes a `web.config` file that handles URL rewriting for the custom base path `/3333_4444__Operational/public/Monitoring_Dashboard/`. This file is essential for Azure App Service to correctly route requests.

## Deployment Methods

### Method 1: Automated Script (Recommended)

1. Make the deployment script executable:
   \`\`\`bash
   chmod +x deploy-azure.sh
   \`\`\`

2. Run the script:
   \`\`\`bash
   ./deploy-azure.sh
   \`\`\`

3. Follow the prompts to log in to Azure

### Method 2: Manual Azure Portal Deployment

1. **Download the project**:
   - Click the three dots in v0 interface → "Download ZIP"
   - Extract the ZIP file

2. **Go to Azure Portal**: [portal.azure.com](https://portal.azure.com)

3. **Create Web App**:
   - Click "Create a resource"
   - Search for "Web App"
   - Fill in:
     - Resource Group: Create new "monitoring-rg"
     - Name: "monitoring-system" (must be unique)
     - Runtime: Node 18 LTS
     - Region: Same as your operational system
     - Pricing: Basic B1 (or higher for production)

4. **Configure Settings**:
   - Go to Configuration → Application settings
   - Add these settings:
     \`\`\`
     NEXT_PUBLIC_API_URL=https://20.170.155.53:8080
     NODE_ENV=production
     \`\`\`

5. **Deploy Code**:
   - Option A: Use VS Code Azure extension
   - Option B: Use GitHub Actions (see `.github/workflows/azure-deploy.yml`)
   - Option C: Use Azure CLI:
     \`\`\`bash
     az webapp up --name monitoring-system --resource-group monitoring-rg
     \`\`\`

### Method 3: Docker Container

1. **Build Docker image**:
   \`\`\`bash
   docker build -t monitoring-system .
   \`\`\`

2. **Push to Azure Container Registry**:
   \`\`\`bash
   az acr create --resource-group monitoring-rg --name monitoringacr --sku Basic
   az acr login --name monitoringacr
   docker tag monitoring-system monitoringacr.azurecr.io/monitoring-system:latest
   docker push monitoringacr.azurecr.io/monitoring-system:latest
   \`\`\`

3. **Create Container Instance**:
   \`\`\`bash
   az container create \
     --resource-group monitoring-rg \
     --name monitoring-system \
     --image monitoringacr.azurecr.io/monitoring-system:latest \
     --dns-name-label monitoring-system \
     --ports 3000
   \`\`\`

## Network Configuration

If your operational system (20.170.155.53) is in a private network:

1. **Set up VNet Integration**:
   - Go to your Web App → Networking
   - Click "VNet Integration"
   - Connect to the same VNet as your operational system

2. **Configure Private Endpoint** (if needed):
   - For enhanced security between the monitoring app and API

## Post-Deployment

1. **Verify the deployment**:
   - Visit `https://[your-app-name].azurewebsites.net/3333_4444__Operational/public/Monitoring_Dashboard`
   - Check if it can connect to your API at `https://20.170.155.53:8080/api/snapshots`

2. **If you see "Cannot GET" error**:
   - Ensure the `web.config` file is deployed to the root of your app
   - Check Azure Portal → App Service → Console and verify `web.config` exists
   - Restart the App Service: `az webapp restart --name [your-app-name] --resource-group [resource-group]`
   - Check logs: Go to Azure Portal → App Service → Log stream

## Base Path Configuration

The app is configured with:
- Base Path: `/3333_4444__Operational/public/Monitoring_Dashboard`
- API URL: `https://20.170.155.53:8080`
- Refresh Rate: 150ms

All internal routes automatically use this base path, so navigation will work correctly at:
- Main page: `/3333_4444__Operational/public/Monitoring_Dashboard/`
- Settings: `/3333_4444__Operational/public/Monitoring_Dashboard/settings`
- API routes: `/3333_4444__Operational/public/Monitoring_Dashboard/api/*`

## Troubleshooting

- **"Cannot GET" error**: 
  - Verify `web.config` is in the deployment package
  - Check that the app is using standalone build mode
  - Restart the App Service
  - Check Node.js version matches (18.x or 20.x)
- **Can't connect to API**: Check VNet integration and firewall rules
- **Build fails**: Check Node version (should be 18.x)
- **App won't start**: Check Application Insights logs in Azure Portal

## Estimated Costs

- **Basic B1 Plan**: ~$13/month
- **Standard S1 Plan**: ~$70/month (recommended for production)
- **Premium P1V2**: ~$80/month (best performance)

## Support

If you encounter issues, check:
1. Azure Portal → App Service → Logs
2. Application Insights for detailed telemetry
3. Deployment Center for deployment history
