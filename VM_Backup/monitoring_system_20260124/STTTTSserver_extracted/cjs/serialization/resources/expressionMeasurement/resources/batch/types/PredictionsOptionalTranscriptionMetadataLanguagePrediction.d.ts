import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { GroupedPredictionsLanguagePrediction } from "./GroupedPredictionsLanguagePrediction.js";
import { TranscriptionMetadata } from "./TranscriptionMetadata.js";
export declare const PredictionsOptionalTranscriptionMetadataLanguagePrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.PredictionsOptionalTranscriptionMetadataLanguagePrediction.Raw, Hume.expressionMeasurement.batch.PredictionsOptionalTranscriptionMetadataLanguagePrediction>;
export declare namespace PredictionsOptionalTranscriptionMetadataLanguagePrediction {
    interface Raw {
        metadata?: TranscriptionMetadata.Raw | null;
        grouped_predictions: GroupedPredictionsLanguagePrediction.Raw[];
    }
}
