import type * as Hume from "../../../../api/index.js";
import * as core from "../../../../core/index.js";
import type * as serializers from "../../../index.js";
export declare const MillisecondInterval: core.serialization.ObjectSchema<serializers.empathicVoice.MillisecondInterval.Raw, Hume.empathicVoice.MillisecondInterval>;
export declare namespace MillisecondInterval {
    interface Raw {
        begin: number;
        end: number;
    }
}
