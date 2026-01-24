import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ReturnChatAudioReconstructionStatus: core.serialization.Schema<serializers.empathicVoice.ReturnChatAudioReconstructionStatus.Raw, Hume.empathicVoice.ReturnChatAudioReconstructionStatus>;
export declare namespace ReturnChatAudioReconstructionStatus {
    type Raw = "QUEUED" | "IN_PROGRESS" | "COMPLETE" | "ERROR" | "CANCELLED";
}
