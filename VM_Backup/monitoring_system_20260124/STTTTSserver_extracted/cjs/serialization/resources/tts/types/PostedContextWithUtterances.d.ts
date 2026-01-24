import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { PostedUtterance } from "./PostedUtterance.js";
export declare const PostedContextWithUtterances: core.serialization.ObjectSchema<serializers.tts.PostedContextWithUtterances.Raw, Hume.tts.PostedContextWithUtterances>;
export declare namespace PostedContextWithUtterances {
    interface Raw {
        utterances: PostedUtterance.Raw[];
    }
}
