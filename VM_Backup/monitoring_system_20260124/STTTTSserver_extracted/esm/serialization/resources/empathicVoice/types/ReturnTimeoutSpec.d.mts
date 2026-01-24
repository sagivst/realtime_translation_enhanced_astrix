import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnTimeoutSpec: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnTimeoutSpec.Raw, Hume.empathicVoice.ReturnTimeoutSpec>;
export declare namespace ReturnTimeoutSpec {
    interface Raw {
        duration_secs?: number | null;
        enabled: boolean;
    }
}
