import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ToolCallMessage } from "./ToolCallMessage.mjs";
import { WebhookEventBase } from "./WebhookEventBase.mjs";
export declare const WebhookEventToolCall: core.serialization.ObjectSchema<serializers.empathicVoice.WebhookEventToolCall.Raw, Hume.empathicVoice.WebhookEventToolCall>;
export declare namespace WebhookEventToolCall {
    interface Raw extends WebhookEventBase.Raw {
        caller_number?: string | null;
        custom_session_id?: string | null;
        event_name?: "tool_call" | null;
        timestamp: number;
        tool_call_message: ToolCallMessage.Raw;
    }
}
