import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { WebhookEventChatEnded } from "./WebhookEventChatEnded.js";
import { WebhookEventChatStarted } from "./WebhookEventChatStarted.js";
import { WebhookEventToolCall } from "./WebhookEventToolCall.js";
export declare const WebhookEvent: core.serialization.Schema<serializers.empathicVoice.WebhookEvent.Raw, Hume.empathicVoice.WebhookEvent>;
export declare namespace WebhookEvent {
    type Raw = WebhookEventChatStarted.Raw | WebhookEventChatEnded.Raw | WebhookEventToolCall.Raw;
}
