import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const WebhookEventChatStatus: core.serialization.Schema<serializers.empathicVoice.WebhookEventChatStatus.Raw, Hume.empathicVoice.WebhookEventChatStatus>;
export declare namespace WebhookEventChatStatus {
    type Raw = "ACTIVE" | "USER_ENDED" | "USER_TIMEOUT" | "INACTIVITY_TIMEOUT" | "MAX_DURATION_TIMEOUT" | "SILENCE_TIMEOUT" | "ERROR";
}
