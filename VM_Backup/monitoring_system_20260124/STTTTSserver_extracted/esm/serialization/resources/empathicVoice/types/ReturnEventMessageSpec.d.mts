import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnEventMessageSpec: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnEventMessageSpec.Raw, Hume.empathicVoice.ReturnEventMessageSpec>;
export declare namespace ReturnEventMessageSpec {
    interface Raw {
        enabled: boolean;
        text?: string | null;
    }
}
