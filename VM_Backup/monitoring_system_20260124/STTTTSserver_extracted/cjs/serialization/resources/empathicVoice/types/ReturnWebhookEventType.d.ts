import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ReturnWebhookEventType: core.serialization.Schema<serializers.empathicVoice.ReturnWebhookEventType.Raw, Hume.empathicVoice.ReturnWebhookEventType>;
export declare namespace ReturnWebhookEventType {
    type Raw = "chat_started" | "chat_ended" | "tool_call";
}
