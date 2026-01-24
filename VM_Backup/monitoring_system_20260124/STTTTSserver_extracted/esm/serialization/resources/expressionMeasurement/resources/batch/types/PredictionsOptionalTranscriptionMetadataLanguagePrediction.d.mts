import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { GroupedPredictionsLanguagePrediction } from "./GroupedPredictionsLanguagePrediction.mjs";
import { TranscriptionMetadata } from "./TranscriptionMetadata.mjs";
export declare const PredictionsOptionalTranscriptionMetadataLanguagePrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.PredictionsOptionalTranscriptionMetadataLanguagePrediction.Raw, Hume.expressionMeasurement.batch.PredictionsOptionalTranscriptionMetadataLanguagePrediction>;
export declare namespace PredictionsOptionalTranscriptionMetadataLanguagePrediction {
    interface Raw {
        metadata?: TranscriptionMetadata.Raw | null;
        grouped_predictions: GroupedPredictionsLanguagePrediction.Raw[];
    }
}
