# Asterisk External Media and ARI - Official Documentation

## Overview

Asterisk 16.6+ introduced the `/channels/externalMedia` ARI resource, enabling developers to "direct media to a proxy service of their own development" for tasks like cloud-based speech recognition, translation, or other audio processing.

## Key Concept

ExternalMedia allows you to **tap into audio streams** from Asterisk bridges and send them to external services via RTP, while optionally injecting processed audio back into the call.

## Required Parameters

When making a POST request to `/channels/externalMedia`:

- **app**: The Stasis application name (e.g., "translation-7003")
- **external_host**: Destination address as `<host>:<port>` (e.g., "127.0.0.1:34122")
- **format**: Codec/format (e.g., "ulaw", "slin16", "g722") - Asterisk handles automatic transcoding

## Complete Workflow

### Step 1: Create ExternalMedia Channel
POST /ari/channels/externalMedia?app=translation-7003&external_host=127.0.0.1:34122&format=slin16&channelId=externalMedia-7003-1234567890

### Step 2: Asterisk Returns Channel Object

### Step 3: Create a Bridge (REQUIRED)
POST /ari/bridges?type=mixing&bridgeId=bridge-7003-1234567890

**IMPORTANT**: The official documentation states: **"Add the channel to an existing bridge"** - this is mandatory! Without a bridge, no media will flow.

### Step 4: Add SIP Channel to Bridge
POST /ari/bridges/{bridgeId}/addChannel?channel={sipChannelId}

### Step 5: Add ExternalMedia Channel to Bridge
POST /ari/bridges/{bridgeId}/addChannel?channel=externalMedia-7003-1234567890

### Step 6: Media Flows Automatically

Once both channels are in the bridge:
- **Bridge → ExternalMedia**: Audio from the SIP call flows to your RTP socket
- **ExternalMedia → Bridge**: You can inject processed audio back into the call

## Why Bridges Are Required

From the official Asterisk documentation:

> "Your ARI application creates a new External Media channel supplying basic parameters like media destination and format, then **adds that channel to an existing bridge**. The channel driver then forwards all media from the bridge to the destination you specified."

**Key Points**:
- ExternalMedia channels **must be added to a bridge** to function
- The bridge is the **source of the audio stream**
- Without a bridge, the ExternalMedia channel has nothing to forward

## Summary

**YES, bridges are required for ExternalMedia**. Without a bridge, ExternalMedia channels have no source of audio to forward.

References: https://docs.asterisk.org/Development/Reference-Information/Asterisk-Framework-and-API-Examples/External-Media-and-ARI/
