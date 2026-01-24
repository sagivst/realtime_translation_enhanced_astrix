import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const AudioInput: core.serialization.ObjectSchema<serializers.empathicVoice.AudioInput.Raw, Hume.empathicVoice.AudioInput>;
export declare namespace AudioInput {
    interface Raw {
        custom_session_id?: string | null;
        data: string;
        type: "audio_input";
    }
}
