import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { WebhookEventBase } from "./WebhookEventBase.js";
import { WebhookEventChatStartType } from "./WebhookEventChatStartType.js";
export declare const WebhookEventChatStarted: core.serialization.ObjectSchema<serializers.empathicVoice.WebhookEventChatStarted.Raw, Hume.empathicVoice.WebhookEventChatStarted>;
export declare namespace WebhookEventChatStarted {
    interface Raw extends WebhookEventBase.Raw {
        caller_number?: string | null;
        chat_start_type: WebhookEventChatStartType.Raw;
        custom_session_id?: string | null;
        event_name?: "chat_started" | null;
        start_time: number;
    }
}
