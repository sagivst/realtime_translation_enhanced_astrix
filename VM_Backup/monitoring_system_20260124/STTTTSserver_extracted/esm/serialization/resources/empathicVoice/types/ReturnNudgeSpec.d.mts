import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnNudgeSpec: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnNudgeSpec.Raw, Hume.empathicVoice.ReturnNudgeSpec>;
export declare namespace ReturnNudgeSpec {
    interface Raw {
        enabled: boolean;
        interval_secs?: number | null;
    }
}
