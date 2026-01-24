import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const AudioInput: core.serialization.ObjectSchema<serializers.empathicVoice.AudioInput.Raw, Hume.empathicVoice.AudioInput>;
export declare namespace AudioInput {
    interface Raw {
        custom_session_id?: string | null;
        data: string;
        type: "audio_input";
    }
}
