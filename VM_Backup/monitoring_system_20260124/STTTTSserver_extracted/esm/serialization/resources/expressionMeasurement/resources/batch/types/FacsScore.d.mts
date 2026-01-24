import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const FacsScore: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.FacsScore.Raw, Hume.expressionMeasurement.batch.FacsScore>;
export declare namespace FacsScore {
    interface Raw {
        name: string;
        score: number;
    }
}
