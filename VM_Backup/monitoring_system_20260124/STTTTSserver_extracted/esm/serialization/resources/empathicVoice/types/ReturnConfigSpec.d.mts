import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const ReturnConfigSpec: core.serialization.ObjectSchema<serializers.empathicVoice.ReturnConfigSpec.Raw, Hume.empathicVoice.ReturnConfigSpec>;
export declare namespace ReturnConfigSpec {
    interface Raw {
        id: string;
        version?: number | null;
    }
}
