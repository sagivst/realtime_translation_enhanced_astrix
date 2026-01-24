import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const PostedContextWithGenerationId: core.serialization.ObjectSchema<serializers.tts.PostedContextWithGenerationId.Raw, Hume.tts.PostedContextWithGenerationId>;
export declare namespace PostedContextWithGenerationId {
    interface Raw {
        generation_id: string;
    }
}
