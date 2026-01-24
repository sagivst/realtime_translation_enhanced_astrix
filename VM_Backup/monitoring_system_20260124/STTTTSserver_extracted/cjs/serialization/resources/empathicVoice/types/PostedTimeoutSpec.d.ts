import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const PostedTimeoutSpec: core.serialization.ObjectSchema<serializers.empathicVoice.PostedTimeoutSpec.Raw, Hume.empathicVoice.PostedTimeoutSpec>;
export declare namespace PostedTimeoutSpec {
    interface Raw {
        duration_secs?: number | null;
        enabled: boolean;
    }
}
