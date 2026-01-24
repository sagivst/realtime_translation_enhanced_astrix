import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { PostedContextWithGenerationId } from "./PostedContextWithGenerationId.mjs";
import { PostedContextWithUtterances } from "./PostedContextWithUtterances.mjs";
export declare const PostedContext: core.serialization.Schema<serializers.tts.PostedContext.Raw, Hume.tts.PostedContext>;
export declare namespace PostedContext {
    type Raw = PostedContextWithGenerationId.Raw | PostedContextWithUtterances.Raw;
}
