import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { PostedUtteranceVoice } from "./PostedUtteranceVoice.js";
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
