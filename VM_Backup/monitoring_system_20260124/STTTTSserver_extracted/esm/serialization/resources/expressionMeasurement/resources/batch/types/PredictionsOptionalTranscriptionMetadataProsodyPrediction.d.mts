import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { GroupedPredictionsProsodyPrediction } from "./GroupedPredictionsProsodyPrediction.mjs";
import { TranscriptionMetadata } from "./TranscriptionMetadata.mjs";
export declare const PredictionsOptionalTranscriptionMetadataProsodyPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.PredictionsOptionalTranscriptionMetadataProsodyPrediction.Raw, Hume.expressionMeasurement.batch.PredictionsOptionalTranscriptionMetadataProsodyPrediction>;
export declare namespace PredictionsOptionalTranscriptionMetadataProsodyPrediction {
    interface Raw {
        metadata?: TranscriptionMetadata.Raw | null;
        grouped_predictions: GroupedPredictionsProsodyPrediction.Raw[];
    }
}
