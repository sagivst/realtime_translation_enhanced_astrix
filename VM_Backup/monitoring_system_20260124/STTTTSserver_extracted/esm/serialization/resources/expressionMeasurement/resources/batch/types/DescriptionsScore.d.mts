import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const DescriptionsScore: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.DescriptionsScore.Raw, Hume.expressionMeasurement.batch.DescriptionsScore>;
export declare namespace DescriptionsScore {
    interface Raw {
        name: string;
        score: number;
    }
}
