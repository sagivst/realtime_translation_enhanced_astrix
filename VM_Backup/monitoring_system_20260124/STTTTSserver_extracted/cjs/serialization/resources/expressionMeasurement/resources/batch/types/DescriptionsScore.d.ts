import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const DescriptionsScore: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.DescriptionsScore.Raw, Hume.expressionMeasurement.batch.DescriptionsScore>;
export declare namespace DescriptionsScore {
    interface Raw {
        name: string;
        score: number;
    }
}
