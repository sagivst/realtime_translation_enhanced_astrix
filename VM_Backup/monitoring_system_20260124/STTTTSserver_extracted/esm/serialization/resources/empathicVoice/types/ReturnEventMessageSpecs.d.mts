import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnEventMessageSpec } from "./ReturnEventMessageSpec.mjs";
export declare const ReturnEventMessageSpecs: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnEventMessageSpecs.Raw, Hume.empathicVoice.ReturnEventMessageSpecs>;
export declare namespace ReturnEventMessageSpecs {
    interface Raw {
        on_inactivity_timeout?: ReturnEventMessageSpec.Raw | null;
        on_max_duration_timeout?: ReturnEventMessageSpec.Raw | null;
        on_new_chat?: ReturnEventMessageSpec.Raw | null;
    }
}
