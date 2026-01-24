import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { Format } from "./Format.js";
import { OctaveVersion } from "./OctaveVersion.js";
import { PostedContext } from "./PostedContext.js";
import { PostedUtterance } from "./PostedUtterance.js";
import { TimestampType } from "./TimestampType.js";
export declare const PostedTts: core.serialization.ObjectSchema<serializers.tts.PostedTts.Raw, Hume.tts.PostedTts>;
export declare namespace PostedTts {
    interface Raw {
        context?: PostedContext.Raw | null;
        format?: Format.Raw | null;
        include_timestamp_types?: TimestampType.Raw[] | null;
        num_generations?: number | null;
        split_utterances?: boolean | null;
        strip_headers?: boolean | null;
        utterances: PostedUtterance.Raw[];
        version?: OctaveVersion.Raw | null;
        instant_mode?: boolean | null;
    }
}
