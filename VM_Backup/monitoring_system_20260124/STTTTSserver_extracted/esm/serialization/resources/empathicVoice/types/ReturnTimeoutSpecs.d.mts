import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
import { ReturnTimeoutSpec } from "./ReturnTimeoutSpec.mjs";
export declare const ReturnTimeoutSpecs: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnTimeoutSpecs.Raw, Hume.empathicVoice.ReturnTimeoutSpecs>;
export declare namespace ReturnTimeoutSpecs {
    interface Raw {
        inactivity: ReturnTimeoutSpec.Raw;
        max_duration: ReturnTimeoutSpec.Raw;
    }
}
