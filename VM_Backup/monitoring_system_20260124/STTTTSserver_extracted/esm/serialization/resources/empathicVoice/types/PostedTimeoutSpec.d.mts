import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const PostedTimeoutSpec: core.serialization.ObjectSchema<serializers.empathicVoice.PostedTimeoutSpec.Raw, Hume.empathicVoice.PostedTimeoutSpec>;
export declare namespace PostedTimeoutSpec {
    interface Raw {
        duration_secs?: number | null;
        enabled: boolean;
    }
}
