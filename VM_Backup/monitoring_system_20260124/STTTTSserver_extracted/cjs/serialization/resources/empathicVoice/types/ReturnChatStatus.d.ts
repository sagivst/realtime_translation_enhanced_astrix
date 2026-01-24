import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ReturnChatStatus: core.serialization.Schema<serializers.empathicVoice.ReturnChatStatus.Raw, Hume.empathicVoice.ReturnChatStatus>;
export declare namespace ReturnChatStatus {
    type Raw = "ACTIVE" | "USER_ENDED" | "USER_TIMEOUT" | "MAX_DURATION_TIMEOUT" | "INACTIVITY_TIMEOUT" | "ERROR";
}
