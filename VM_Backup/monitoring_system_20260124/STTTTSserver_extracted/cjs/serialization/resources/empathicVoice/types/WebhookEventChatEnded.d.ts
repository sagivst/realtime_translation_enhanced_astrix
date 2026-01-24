import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { WebhookEventBase } from "./WebhookEventBase.js";
import { WebhookEventChatStatus } from "./WebhookEventChatStatus.js";
export declare const WebhookEventChatEnded: core.serialization.ObjectSchema<serializers.empathicVoice.WebhookEventChatEnded.Raw, Hume.empathicVoice.WebhookEventChatEnded>;
export declare namespace WebhookEventChatEnded {
    interface Raw extends WebhookEventBase.Raw {
        caller_number?: string | null;
        custom_session_id?: string | null;
        duration_seconds: number;
        end_reason: WebhookEventChatStatus.Raw;
        end_time: number;
        event_name?: "chat_ended" | null;
    }
}
