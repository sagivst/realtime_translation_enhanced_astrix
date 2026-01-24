import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const TextPosition: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.TextPosition.Raw, Hume.expressionMeasurement.stream.TextPosition>;
export declare namespace TextPosition {
    interface Raw {
        begin?: number | null;
        end?: number | null;
    }
}
