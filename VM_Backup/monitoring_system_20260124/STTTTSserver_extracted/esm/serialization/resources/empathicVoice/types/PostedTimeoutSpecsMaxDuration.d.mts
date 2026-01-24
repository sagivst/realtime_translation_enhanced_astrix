import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const PostedTimeoutSpecsMaxDuration: core.serialization.ObjectSchema<serializers.empathicVoice.PostedTimeoutSpecsMaxDuration.Raw, Hume.empathicVoice.PostedTimeoutSpecsMaxDuration>;
export declare namespace PostedTimeoutSpecsMaxDuration {
    interface Raw {
        duration_secs?: number | null;
        enabled: boolean;
    }
}
