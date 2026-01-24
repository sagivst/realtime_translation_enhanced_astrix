import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { GroupedPredictionsProsodyPrediction } from "./GroupedPredictionsProsodyPrediction.js";
import { TranscriptionMetadata } from "./TranscriptionMetadata.js";
export declare const PredictionsOptionalTranscriptionMetadataProsodyPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.PredictionsOptionalTranscriptionMetadataProsodyPrediction.Raw, Hume.expressionMeasurement.batch.PredictionsOptionalTranscriptionMetadataProsodyPrediction>;
export declare namespace PredictionsOptionalTranscriptionMetadataProsodyPrediction {
    interface Raw {
        metadata?: TranscriptionMetadata.Raw | null;
        grouped_predictions: GroupedPredictionsProsodyPrediction.Raw[];
    }
}
