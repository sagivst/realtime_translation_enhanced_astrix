import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnChatPagedEventsStatus: core.serialization.Schema<serializers.empathicVoice.ReturnChatPagedEventsStatus.Raw, Hume.empathicVoice.ReturnChatPagedEventsStatus>;
export declare namespace ReturnChatPagedEventsStatus {
    type Raw = "ACTIVE" | "USER_ENDED" | "USER_TIMEOUT" | "MAX_DURATION_TIMEOUT" | "INACTIVITY_TIMEOUT" | "ERROR";
}
