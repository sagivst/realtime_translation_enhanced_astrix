import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ToolCallMessage } from "./ToolCallMessage.js";
import { WebhookEventBase } from "./WebhookEventBase.js";
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
