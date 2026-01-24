import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const TextPosition: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.TextPosition.Raw, Hume.expressionMeasurement.stream.TextPosition>;
export declare namespace TextPosition {
    interface Raw {
        begin?: number | null;
        end?: number | null;
    }
}
