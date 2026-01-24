import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { PostedUtteranceVoice } from "./PostedUtteranceVoice.mjs";
export declare const PostedUtterance: core.serialization.ObjectSchema<serializers.tts.PostedUtterance.Raw, Hume.tts.PostedUtterance>;
export declare namespace PostedUtterance {
    interface Raw {
        description?: string | null;
        speed?: number | null;
        text: string;
        trailing_silence?: number | null;
        voice?: PostedUtteranceVoice.Raw | null;
    }
}
