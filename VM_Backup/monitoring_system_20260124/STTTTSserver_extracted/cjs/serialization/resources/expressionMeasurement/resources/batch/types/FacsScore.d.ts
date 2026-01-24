import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
export declare const FacsScore: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.FacsScore.Raw, Hume.expressionMeasurement.batch.FacsScore>;
export declare namespace FacsScore {
    interface Raw {
        name: string;
        score: number;
    }
}
