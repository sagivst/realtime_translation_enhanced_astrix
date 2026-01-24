import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { PostedContextWithGenerationId } from "./PostedContextWithGenerationId.js";
import { PostedContextWithUtterances } from "./PostedContextWithUtterances.js";
export declare const PostedContext: core.serialization.Schema<serializers.tts.PostedContext.Raw, Hume.tts.PostedContext>;
export declare namespace PostedContext {
    type Raw = PostedContextWithGenerationId.Raw | PostedContextWithUtterances.Raw;
}
