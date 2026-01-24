import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const PostedTimeoutSpecsInactivity: core.serialization.ObjectSchema<serializers.empathicVoice.PostedTimeoutSpecsInactivity.Raw, Hume.empathicVoice.PostedTimeoutSpecsInactivity>;
export declare namespace PostedTimeoutSpecsInactivity {
    interface Raw {
        duration_secs?: number | null;
        enabled: boolean;
    }
}
