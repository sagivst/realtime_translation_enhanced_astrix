import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const ToxicityItem: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.ToxicityItem.Raw, Hume.expressionMeasurement.stream.ToxicityItem>;
export declare namespace ToxicityItem {
    interface Raw {
        name?: string | null;
        score?: number | null;
    }
}
