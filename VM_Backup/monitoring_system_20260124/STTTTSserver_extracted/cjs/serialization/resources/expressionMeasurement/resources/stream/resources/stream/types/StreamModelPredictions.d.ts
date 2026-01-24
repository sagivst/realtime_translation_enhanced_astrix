import type * as Hume from "../../../../../../../../api/index.js";
import * as core from "../../../../../../../../core/index.js";
import type * as serializers from "../../../../../../../index.js";
import { StreamModelPredictionsBurst } from "./StreamModelPredictionsBurst.js";
import { StreamModelPredictionsFace } from "./StreamModelPredictionsFace.js";
import { StreamModelPredictionsFacemesh } from "./StreamModelPredictionsFacemesh.js";
import { StreamModelPredictionsJobDetails } from "./StreamModelPredictionsJobDetails.js";
import { StreamModelPredictionsLanguage } from "./StreamModelPredictionsLanguage.js";
import { StreamModelPredictionsProsody } from "./StreamModelPredictionsProsody.js";
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
