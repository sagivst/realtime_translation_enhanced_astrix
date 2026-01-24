import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const PostedTimeoutSpecsMaxDuration: core.serialization.ObjectSchema<serializers.empathicVoice.PostedTimeoutSpecsMaxDuration.Raw, Hume.empathicVoice.PostedTimeoutSpecsMaxDuration>;
export declare namespace PostedTimeoutSpecsMaxDuration {
    interface Raw {
        duration_secs?: number | null;
        enabled: boolean;
    }
}
