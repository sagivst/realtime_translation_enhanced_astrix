import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnChatAudioReconstructionStatus } from "./ReturnChatAudioReconstructionStatus.js";
export declare const ReturnChatAudioReconstruction: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnChatAudioReconstruction.Raw, Hume.empathicVoice.ReturnChatAudioReconstruction>;
export declare namespace ReturnChatAudioReconstruction {
    interface Raw {
        filename?: string | null;
        id: string;
        modified_at?: number | null;
        signed_audio_url?: string | null;
        signed_url_expiration_timestamp_millis?: number | null;
        status: ReturnChatAudioReconstructionStatus.Raw;
        user_id: string;
    }
}
