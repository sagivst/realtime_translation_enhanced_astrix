import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const Window: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.Window.Raw, Hume.expressionMeasurement.batch.Window>;
export declare namespace Window {
    interface Raw {
        length?: number | null;
        step?: number | null;
    }
}
