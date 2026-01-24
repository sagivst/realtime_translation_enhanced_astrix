import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const StreamBoundingBox: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamBoundingBox.Raw, Hume.expressionMeasurement.stream.StreamBoundingBox>;
export declare namespace StreamBoundingBox {
    interface Raw {
        x?: number | null;
        y?: number | null;
        w?: number | null;
        h?: number | null;
    }
}
