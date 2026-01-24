import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const PostedContextWithGenerationId: core.serialization.ObjectSchema<serializers.tts.PostedContextWithGenerationId.Raw, Hume.tts.PostedContextWithGenerationId>;
export declare namespace PostedContextWithGenerationId {
    interface Raw {
        generation_id: string;
    }
}
