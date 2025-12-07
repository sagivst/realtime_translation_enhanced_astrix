# GitHub to Azure Automated Deployment Guide

This guide will help you set up automated deployment from GitHub to Azure for the Monitoring Dashboard.

## Prerequisites

- Azure account with active subscription
- GitHub account
- v0 project connected to GitHub

## Step 1: Connect v0 to GitHub

1. In the v0 interface, click **Settings** in the left sidebar
2. Under "GitHub Repository", click **Connect GitHub**
3. Authorize v0 to access your GitHub account
4. Choose:
   - **Create new repository**: `monitoring-dashboard` (recommended)
   - Or select an existing repository
5. v0 will automatically push all code to GitHub

## Step 2: Set Up Azure Resources

You have two options:

### Option A: Automatic Setup (Recommended)

After connecting to GitHub, clone the repository and run:

\`\`\`bash
# Clone your GitHub repository
git clone https://github.com/YOUR_USERNAME/monitoring-dashboard.git
cd monitoring-dashboard

# Run the deployment script
chmod +x deploy-azure.sh
./deploy-azure.sh
\`\`\`

The script will:
- Create Azure resource group
- Create App Service plan
- Create Web App
- Configure environment variables
- Deploy the application

### Option B: Manual Azure Portal Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a **Resource Group** named `monitoring-rg`
3. Create an **App Service**:
   - Name: `monitoring-system` (must be globally unique)
   - Runtime: Node 18 LTS
   - Operating System: Linux
   - Region: Choose closest to your operational system
4. Configure **Application Settings** in the App Service:
   - `NEXT_PUBLIC_API_URL`: `https://20.170.155.53:8080`
   - `NODE_ENV`: `production`

## Step 3: Configure GitHub Secrets

To enable automated deployment, add Azure credentials to GitHub:

1. In Azure Portal, go to your App Service
2. Click **Get publish profile** (download the `.PublishSettings` file)
3. In GitHub, go to your repository
4. Click **Settings** → **Secrets and variables** → **Actions**
5. Click **New repository secret**
6. Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
7. Value: Paste the entire contents of the `.PublishSettings` file
8. Click **Add secret**

## Step 4: Configure Deployment Path

The app is configured to deploy at:
\`\`\`
/3333_4444__Operational/public/Monitoring_Dashboard/
\`\`\`

To access the app, the URL will be:
\`\`\`
https://YOUR-APP-NAME.azurewebsites.net/3333_4444__Operational/public/Monitoring_Dashboard/
\`\`\`

## Step 5: Trigger First Deployment

### Automatic Trigger
Push any change to the `main` branch:
\`\`\`bash
git add .
git commit -m "Initial deployment"
git push origin main
\`\`\`

The GitHub Actions workflow will automatically:
1. Build the Next.js application
2. Run tests (if configured)
3. Deploy to Azure
4. Configure environment variables

### Manual Trigger
You can also trigger deployment manually:
1. Go to GitHub repository
2. Click **Actions** tab
3. Select **Deploy to Azure** workflow
4. Click **Run workflow**

## Step 6: Monitor Deployment

1. Go to your GitHub repository
2. Click the **Actions** tab
3. Watch the deployment progress in real-time
4. Check for any errors or warnings

## Step 7: Verify Deployment

Once deployment completes:

1. Open your browser
2. Navigate to: `https://YOUR-APP-NAME.azurewebsites.net/3333_4444__Operational/public/Monitoring_Dashboard/`
3. The monitoring dashboard should load
4. Check that it connects to your operational API at `20.170.155.53:8080`

## Automated Updates

From now on, whenever you make changes in v0:
1. v0 automatically syncs changes to GitHub
2. GitHub Actions detects the push to `main` branch
3. GitHub Actions automatically builds and deploys to Azure
4. Your live site updates within 2-5 minutes

## Troubleshooting

### Deployment Fails
- Check GitHub Actions logs for specific errors
- Verify Azure publish profile is correct
- Ensure all environment variables are set

### App Doesn't Load
- Check Azure App Service logs in Azure Portal
- Verify the base path configuration in `next.config.mjs`
- Ensure Node.js version matches (18.x)

### API Connection Issues
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check that Azure App Service can reach `20.170.155.53:8080`
- Review network security groups and firewall rules

## Environment Variables

Current configuration:
- `NEXT_PUBLIC_API_URL`: `https://20.170.155.53:8080`
- `NODE_ENV`: `production`

To update environment variables:
\`\`\`bash
az webapp config appsettings set \
  --resource-group monitoring-rg \
  --name monitoring-system \
  --settings NEXT_PUBLIC_API_URL="https://YOUR-API-URL"
\`\`\`

## Monitoring and Logs

View live logs:
\`\`\`bash
az webapp log tail --resource-group monitoring-rg --name monitoring-system
\`\`\`

Or in Azure Portal:
1. Go to your App Service
2. Click **Log stream** in the left menu
3. View real-time application logs

## Cost Estimation

Basic tier (B1):
- ~$13/month
- 1.75 GB RAM
- 100 GB storage
- Suitable for development/testing

Production tier (P1V2):
- ~$78/month
- 3.5 GB RAM
- 250 GB storage
- Better performance and SLA

## Next Steps

1. Connect v0 to GitHub
2. Run deployment script or manually set up Azure
3. Configure GitHub secrets
4. Push to trigger first deployment
5. Monitor deployment in GitHub Actions
6. Verify the app is accessible

The monitoring dashboard will now automatically update whenever you make changes in v0!
