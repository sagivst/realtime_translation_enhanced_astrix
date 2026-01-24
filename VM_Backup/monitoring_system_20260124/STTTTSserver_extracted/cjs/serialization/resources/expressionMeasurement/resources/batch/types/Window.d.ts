import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const Window: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Window.Raw, Hume.expressionMeasurement.batch.Window>;
export declare namespace Window {
    interface Raw {
        length?: number | null;
        step?: number | null;
    }
}
