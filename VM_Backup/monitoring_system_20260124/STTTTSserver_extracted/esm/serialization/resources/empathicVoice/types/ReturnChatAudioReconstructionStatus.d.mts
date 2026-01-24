import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnChatAudioReconstructionStatus: core.serialization.Schema<serializers.empathicVoice.ReturnChatAudioReconstructionStatus.Raw, Hume.empathicVoice.ReturnChatAudioReconstructionStatus>;
export declare namespace ReturnChatAudioReconstructionStatus {
    type Raw = "QUEUED" | "IN_PROGRESS" | "COMPLETE" | "ERROR" | "CANCELLED";
}
