import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ReturnEventMessageSpec: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnEventMessageSpec.Raw, Hume.empathicVoice.ReturnEventMessageSpec>;
export declare namespace ReturnEventMessageSpec {
    interface Raw {
        enabled: boolean;
        text?: string | null;
    }
}
