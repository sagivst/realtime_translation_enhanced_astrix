import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const ToxicityItem: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.ToxicityItem.Raw, Hume.expressionMeasurement.stream.ToxicityItem>;
export declare namespace ToxicityItem {
    interface Raw {
        name?: string | null;
        score?: number | null;
    }
}
