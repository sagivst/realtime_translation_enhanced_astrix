import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const WebhookEventChatStatus: core.serialization.Schema<serializers.empathicVoice.WebhookEventChatStatus.Raw, Hume.empathicVoice.WebhookEventChatStatus>;
export declare namespace WebhookEventChatStatus {
    type Raw = "ACTIVE" | "USER_ENDED" | "USER_TIMEOUT" | "INACTIVITY_TIMEOUT" | "MAX_DURATION_TIMEOUT" | "SILENCE_TIMEOUT" | "ERROR";
}
