import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { PredictionsOptionalNullBurstPrediction } from "./PredictionsOptionalNullBurstPrediction.js";
import { PredictionsOptionalNullFacemeshPrediction } from "./PredictionsOptionalNullFacemeshPrediction.js";
import { PredictionsOptionalNullFacePrediction } from "./PredictionsOptionalNullFacePrediction.js";
import { PredictionsOptionalTranscriptionMetadataLanguagePrediction } from "./PredictionsOptionalTranscriptionMetadataLanguagePrediction.js";
import { PredictionsOptionalTranscriptionMetadataNerPrediction } from "./PredictionsOptionalTranscriptionMetadataNerPrediction.js";
import { PredictionsOptionalTranscriptionMetadataProsodyPrediction } from "./PredictionsOptionalTranscriptionMetadataProsodyPrediction.js";
export declare const ModelsPredictions: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.ModelsPredictions.Raw, Hume.expressionMeasurement.batch.ModelsPredictions>;
export declare namespace ModelsPredictions {
    interface Raw {
        face?: PredictionsOptionalNullFacePrediction.Raw | null;
        burst?: PredictionsOptionalNullBurstPrediction.Raw | null;
        prosody?: PredictionsOptionalTranscriptionMetadataProsodyPrediction.Raw | null;
        language?: PredictionsOptionalTranscriptionMetadataLanguagePrediction.Raw | null;
        ner?: PredictionsOptionalTranscriptionMetadataNerPrediction.Raw | null;
        facemesh?: PredictionsOptionalNullFacemeshPrediction.Raw | null;
    }
}
