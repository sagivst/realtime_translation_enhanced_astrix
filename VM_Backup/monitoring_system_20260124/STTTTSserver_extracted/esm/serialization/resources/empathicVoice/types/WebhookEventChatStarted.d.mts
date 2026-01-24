import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { WebhookEventBase } from "./WebhookEventBase.mjs";
import { WebhookEventChatStartType } from "./WebhookEventChatStartType.mjs";
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
