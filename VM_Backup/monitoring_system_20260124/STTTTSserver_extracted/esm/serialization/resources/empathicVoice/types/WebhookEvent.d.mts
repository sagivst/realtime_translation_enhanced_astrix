import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { WebhookEventChatEnded } from "./WebhookEventChatEnded.mjs";
import { WebhookEventChatStarted } from "./WebhookEventChatStarted.mjs";
import { WebhookEventToolCall } from "./WebhookEventToolCall.mjs";
export declare const WebhookEvent: core.serialization.Schema<serializers.empathicVoice.WebhookEvent.Raw, Hume.empathicVoice.WebhookEvent>;
export declare namespace WebhookEvent {
    type Raw = WebhookEventChatStarted.Raw | WebhookEventChatEnded.Raw | WebhookEventToolCall.Raw;
}
