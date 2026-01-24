import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const PostedWebhookEventType: core.serialization.Schema<serializers.empathicVoice.PostedWebhookEventType.Raw, Hume.empathicVoice.PostedWebhookEventType>;
export declare namespace PostedWebhookEventType {
    type Raw = "chat_started" | "chat_ended" | "tool_call";
}
