import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
export declare const StreamModelPredictionsJobDetails: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictionsJobDetails.Raw, Hume.expressionMeasurement.stream.StreamModelPredictionsJobDetails>;
export declare namespace StreamModelPredictionsJobDetails {
    interface Raw {
        job_id?: string | null;
    }
}
