import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const WebhookEventChatStartType: core.serialization.Schema<serializers.empathicVoice.WebhookEventChatStartType.Raw, Hume.empathicVoice.WebhookEventChatStartType>;
export declare namespace WebhookEventChatStartType {
    type Raw = "new_chat_group" | "resumed_chat_group";
}
