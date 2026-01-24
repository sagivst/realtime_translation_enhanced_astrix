import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const BoundingBox: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.BoundingBox.Raw, Hume.expressionMeasurement.batch.BoundingBox>;
export declare namespace BoundingBox {
    interface Raw {
        x: number;
        y: number;
        w: number;
        h: number;
    }
}
