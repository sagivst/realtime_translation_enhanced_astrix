import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ReturnTimeoutSpec: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnTimeoutSpec.Raw, Hume.empathicVoice.ReturnTimeoutSpec>;
export declare namespace ReturnTimeoutSpec {
    interface Raw {
        duration_secs?: number | null;
        enabled: boolean;
    }
}
