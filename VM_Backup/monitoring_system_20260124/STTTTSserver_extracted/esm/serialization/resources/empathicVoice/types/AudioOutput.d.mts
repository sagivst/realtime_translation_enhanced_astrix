import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
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
