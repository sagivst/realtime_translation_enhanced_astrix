import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const PostedNudgeSpec: core.serialization.ObjectSchema<serializers.empathicVoice.PostedNudgeSpec.Raw, Hume.empathicVoice.PostedNudgeSpec>;
export declare namespace PostedNudgeSpec {
    interface Raw {
        enabled?: boolean | null;
        interval_secs?: number | null;
    }
}
