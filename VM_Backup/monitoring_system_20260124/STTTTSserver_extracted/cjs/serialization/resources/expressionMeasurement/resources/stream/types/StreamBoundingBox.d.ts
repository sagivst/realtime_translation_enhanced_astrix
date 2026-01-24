import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const StreamBoundingBox: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamBoundingBox.Raw, Hume.expressionMeasurement.stream.StreamBoundingBox>;
export declare namespace StreamBoundingBox {
    interface Raw {
        x?: number | null;
        y?: number | null;
        w?: number | null;
        h?: number | null;
    }
}
