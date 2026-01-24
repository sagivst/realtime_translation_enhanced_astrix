import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
import { ReturnTimeoutSpec } from "./ReturnTimeoutSpec.js";
export declare const ReturnTimeoutSpecs: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnTimeoutSpecs.Raw, Hume.empathicVoice.ReturnTimeoutSpecs>;
export declare namespace ReturnTimeoutSpecs {
    interface Raw {
        inactivity: ReturnTimeoutSpec.Raw;
        max_duration: ReturnTimeoutSpec.Raw;
    }
}
