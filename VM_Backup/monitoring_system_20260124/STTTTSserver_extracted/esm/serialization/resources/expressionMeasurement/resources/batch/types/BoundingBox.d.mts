import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const BoundingBox: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.BoundingBox.Raw, Hume.expressionMeasurement.batch.BoundingBox>;
export declare namespace BoundingBox {
    interface Raw {
        x: number;
        y: number;
        w: number;
        h: number;
    }
}
