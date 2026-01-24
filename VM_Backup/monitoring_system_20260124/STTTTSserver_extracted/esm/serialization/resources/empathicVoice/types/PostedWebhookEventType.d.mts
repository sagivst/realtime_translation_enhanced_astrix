import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const PostedWebhookEventType: core.serialization.Schema<serializers.empathicVoice.PostedWebhookEventType.Raw, Hume.empathicVoice.PostedWebhookEventType>;
export declare namespace PostedWebhookEventType {
    type Raw = "chat_started" | "chat_ended" | "tool_call";
}
