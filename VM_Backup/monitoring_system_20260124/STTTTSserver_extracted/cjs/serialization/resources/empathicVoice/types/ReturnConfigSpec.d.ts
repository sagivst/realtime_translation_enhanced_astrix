import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const ReturnConfigSpec: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnConfigSpec.Raw, Hume.empathicVoice.ReturnConfigSpec>;
export declare namespace ReturnConfigSpec {
    interface Raw {
        id: string;
        version?: number | null;
    }
}
