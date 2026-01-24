import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnChatStatus: core.serialization.Schema<serializers.empathicVoice.ReturnChatStatus.Raw, Hume.empathicVoice.ReturnChatStatus>;
export declare namespace ReturnChatStatus {
    type Raw = "ACTIVE" | "USER_ENDED" | "USER_TIMEOUT" | "MAX_DURATION_TIMEOUT" | "INACTIVITY_TIMEOUT" | "ERROR";
}
