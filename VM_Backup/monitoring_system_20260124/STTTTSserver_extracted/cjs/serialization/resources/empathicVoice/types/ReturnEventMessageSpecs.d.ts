import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnEventMessageSpec } from "./ReturnEventMessageSpec.js";
export declare const ReturnEventMessageSpecs: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnEventMessageSpecs.Raw, Hume.empathicVoice.ReturnEventMessageSpecs>;
export declare namespace ReturnEventMessageSpecs {
    interface Raw {
        on_inactivity_timeout?: ReturnEventMessageSpec.Raw | null;
        on_max_duration_timeout?: ReturnEventMessageSpec.Raw | null;
        on_new_chat?: ReturnEventMessageSpec.Raw | null;
    }
}
