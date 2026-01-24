import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { PostedUtterance } from "./PostedUtterance.mjs";
export declare const PostedContextWithUtterances: core.serialization.ObjectSchema<serializers.tts.PostedContextWithUtterances.Raw, Hume.tts.PostedContextWithUtterances>;
export declare namespace PostedContextWithUtterances {
    interface Raw {
        utterances: PostedUtterance.Raw[];
    }
}
