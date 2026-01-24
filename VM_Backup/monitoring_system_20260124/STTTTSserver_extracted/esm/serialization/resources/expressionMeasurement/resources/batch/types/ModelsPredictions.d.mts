import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { PredictionsOptionalNullBurstPrediction } from "./PredictionsOptionalNullBurstPrediction.mjs";
import { PredictionsOptionalNullFacemeshPrediction } from "./PredictionsOptionalNullFacemeshPrediction.mjs";
import { PredictionsOptionalNullFacePrediction } from "./PredictionsOptionalNullFacePrediction.mjs";
import { PredictionsOptionalTranscriptionMetadataLanguagePrediction } from "./PredictionsOptionalTranscriptionMetadataLanguagePrediction.mjs";
import { PredictionsOptionalTranscriptionMetadataNerPrediction } from "./PredictionsOptionalTranscriptionMetadataNerPrediction.mjs";
import { PredictionsOptionalTranscriptionMetadataProsodyPrediction } from "./PredictionsOptionalTranscriptionMetadataProsodyPrediction.mjs";
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
