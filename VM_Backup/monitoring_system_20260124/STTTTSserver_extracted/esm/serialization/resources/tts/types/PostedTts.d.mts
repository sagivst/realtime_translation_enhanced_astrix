import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { Format } from "./Format.mjs";
import { OctaveVersion } from "./OctaveVersion.mjs";
import { PostedContext } from "./PostedContext.mjs";
import { PostedUtterance } from "./PostedUtterance.mjs";
import { TimestampType } from "./TimestampType.mjs";
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
