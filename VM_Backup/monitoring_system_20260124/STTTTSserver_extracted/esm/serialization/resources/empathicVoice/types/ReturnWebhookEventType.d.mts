import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnWebhookEventType: core.serialization.Schema<serializers.empathicVoice.ReturnWebhookEventType.Raw, Hume.empathicVoice.ReturnWebhookEventType>;
export declare namespace ReturnWebhookEventType {
    type Raw = "chat_started" | "chat_ended" | "tool_call";
}
