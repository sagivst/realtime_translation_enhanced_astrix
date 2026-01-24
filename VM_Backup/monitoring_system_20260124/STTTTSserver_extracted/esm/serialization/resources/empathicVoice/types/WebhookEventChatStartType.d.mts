import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const WebhookEventChatStartType: core.serialization.Schema<serializers.empathicVoice.WebhookEventChatStartType.Raw, Hume.empathicVoice.WebhookEventChatStartType>;
export declare namespace WebhookEventChatStartType {
    type Raw = "new_chat_group" | "resumed_chat_group";
}
