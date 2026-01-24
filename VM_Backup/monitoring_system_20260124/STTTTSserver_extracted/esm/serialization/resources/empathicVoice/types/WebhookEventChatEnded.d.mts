import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { WebhookEventBase } from "./WebhookEventBase.mjs";
import { WebhookEventChatStatus } from "./WebhookEventChatStatus.mjs";
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
