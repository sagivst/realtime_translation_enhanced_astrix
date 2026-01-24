import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ReturnChatPagedEventsStatus: core.serialization.Schema<serializers.empathicVoice.ReturnChatPagedEventsStatus.Raw, Hume.empathicVoice.ReturnChatPagedEventsStatus>;
export declare namespace ReturnChatPagedEventsStatus {
    type Raw = "ACTIVE" | "USER_ENDED" | "USER_TIMEOUT" | "MAX_DURATION_TIMEOUT" | "INACTIVITY_TIMEOUT" | "ERROR";
}
