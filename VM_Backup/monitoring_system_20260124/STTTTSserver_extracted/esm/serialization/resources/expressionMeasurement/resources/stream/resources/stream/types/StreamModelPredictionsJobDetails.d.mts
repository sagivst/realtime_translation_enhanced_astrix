import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
export declare const StreamModelPredictionsJobDetails: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsJobDetails.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsJobDetails>;
export declare namespace StreamModelPredictionsJobDetails {
    interface Raw {
        job_id?: string | null;
    }
}
