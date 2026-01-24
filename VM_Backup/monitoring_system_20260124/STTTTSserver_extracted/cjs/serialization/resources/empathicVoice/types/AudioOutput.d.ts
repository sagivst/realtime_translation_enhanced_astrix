import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const AudioOutput: core.serialization.ObjectSchema<serializers.empathicVoice.AudioOutput.Raw, Hume.empathicVoice.AudioOutput>;
export declare namespace AudioOutput {
    interface Raw {
        custom_session_id?: string | null;
        data: string;
        id: string;
        index: number;
        type: "audio_output";
    }
}
