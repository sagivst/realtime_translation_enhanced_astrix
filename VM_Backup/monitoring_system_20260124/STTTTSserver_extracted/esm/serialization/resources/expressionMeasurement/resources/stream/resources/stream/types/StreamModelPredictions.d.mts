import type * as Hume from "../../../../../../../../api/index.mjs";
import * as core from "../../../../../../../../core/index.mjs";
import type * as serializers from "../../../../../../../index.mjs";
import { StreamModelPredictionsBurst } from "./StreamModelPredictionsBurst.mjs";
import { StreamModelPredictionsFace } from "./StreamModelPredictionsFace.mjs";
import { StreamModelPredictionsFacemesh } from "./StreamModelPredictionsFacemesh.mjs";
import { StreamModelPredictionsJobDetails } from "./StreamModelPredictionsJobDetails.mjs";
import { StreamModelPredictionsLanguage } from "./StreamModelPredictionsLanguage.mjs";
import { StreamModelPredictionsProsody } from "./StreamModelPredictionsProsody.mjs";
export declare const StreamModelPredictions: core.serialization.ObjectSchema<serializers.expressionMeasurement.stream.StreamModelPredictions.Raw, Hume.expressionMeasurement.stream.StreamModelPredictions>;
export declare namespace StreamModelPredictions {
    interface Raw {
        payload_id?: string | null;
        job_details?: StreamModelPredictionsJobDetails.Raw | null;
        burst?: StreamModelPredictionsBurst.Raw | null;
        face?: StreamModelPredictionsFace.Raw | null;
        facemesh?: StreamModelPredictionsFacemesh.Raw | null;
        language?: StreamModelPredictionsLanguage.Raw | null;
        prosody?: StreamModelPredictionsProsody.Raw | null;
    }
}
