import type * as Hume from "../../../../api/index.mjs";
import * as core from "../../../../core/index.mjs";
import type * as serializers from "../../../index.mjs";
export declare const MillisecondInterval: core.serialization.ObjectSchema<serializers.empathicVoice.MillisecondInterval.Raw, Hume.empathicVoice.MillisecondInterval>;
export declare namespace MillisecondInterval {
    interface Raw {
        begin: number;
        end: number;
    }
}
