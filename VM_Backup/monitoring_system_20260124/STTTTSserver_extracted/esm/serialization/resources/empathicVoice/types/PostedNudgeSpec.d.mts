import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const PostedNudgeSpec: core.serialization.ObjectSchema<serializers.empathicVoice.PostedNudgeSpec.Raw, Hume.empathicVoice.PostedNudgeSpec>;
export declare namespace PostedNudgeSpec {
    interface Raw {
        enabled?: boolean | null;
        interval_secs?: number | null;
    }
}
