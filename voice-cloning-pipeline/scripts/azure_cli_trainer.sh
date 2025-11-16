#!/bin/bash
##############################################################################
# Azure Custom Voice Training via Azure CLI
# Alternative to Speech Studio UI
##############################################################################

set -e

# Load environment
source ../.env.voice-cloning

SPEECH_KEY="3fa28757795e4b2fb1d5e7869883b893"
SPEECH_REGION="eastus"
API_VERSION="2024-02-01-preview"

BASE_URL="https://${SPEECH_REGION}.api.cognitive.microsoft.com/customvoice"

echo "=========================================="
echo "Azure Custom Voice - CLI Trainer"
echo "=========================================="
echo ""
echo "Region: ${SPEECH_REGION}"
echo "API Version: ${API_VERSION}"
echo ""

# Function to create project
create_project() {
    USER_ID=$1
    DISPLAY_NAME=$2

    echo "Creating project for: ${DISPLAY_NAME}"

    RESPONSE=$(curl -s -X POST \
        "${BASE_URL}/projects?api-version=${API_VERSION}" \
        -H "Ocp-Apim-Subscription-Key: ${SPEECH_KEY}" \
        -H "Content-Type: application/json" \
        -d '{
            "description": "Custom voice for '"${DISPLAY_NAME}"'",
            "projectKind": "CustomVoice",
            "customVoiceType": "MultiStyle"
        }')

    echo "Response: $RESPONSE"

    PROJECT_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$PROJECT_ID" ]; then
        echo "✓ Project created: $PROJECT_ID"
        echo "$PROJECT_ID" > "project_${USER_ID}.txt"
        return 0
    else
        echo "✗ Failed to create project"
        echo "$RESPONSE"
        return 1
    fi
}

# Try creating one project
create_project "Boyan_Tiholov" "Boyan Tiholov"
