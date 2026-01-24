import type * as Hume from "../../../../../../../api/index.mjs";
import * as core from "../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../index.mjs";
export declare const PostedVoice: core.serialization.Schema<serializers.tts.PostedVoice.Raw, Hume.tts.PostedVoice>;
export declare namespace PostedVoice {
    interface Raw {
        generation_id: string;
        name: string;
    }
}
