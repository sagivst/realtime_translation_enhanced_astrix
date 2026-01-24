import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ReturnNudgeSpec: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnNudgeSpec.Raw, Hume.empathicVoice.ReturnNudgeSpec>;
export declare namespace ReturnNudgeSpec {
    interface Raw {
        enabled: boolean;
        interval_secs?: number | null;
    }
}
