import type * as Hume from "../../../../../../../api/index.js";
import * as core from "../../../../../../../core/index.js";
import type * as serializers from "../../../../../../index.js";
export declare const PostedVoice: core.serialization.Schema<serializers.tts.PostedVoice.Raw, Hume.tts.PostedVoice>;
export declare namespace PostedVoice {
    interface Raw {
        generation_id: string;
        name: string;
    }
}
