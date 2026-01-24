import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const PostedTimeoutSpecsInactivity: core.serialization.ObjectSchema<serializers.empathicVoice.PostedTimeoutSpecsInactivity.Raw, Hume.empathicVoice.PostedTimeoutSpecsInactivity>;
export declare namespace PostedTimeoutSpecsInactivity {
    interface Raw {
        duration_secs?: number | null;
        enabled: boolean;
    }
}
