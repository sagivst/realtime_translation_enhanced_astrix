import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { GroupedPredictionsNerPrediction } from "./GroupedPredictionsNerPrediction.js";
import { TranscriptionMetadata } from "./TranscriptionMetadata.js";
export declare const PredictionsOptionalTranscriptionMetadataNerPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.PredictionsOptionalTranscriptionMetadataNerPrediction.Raw, Hume.expressionMeasurement.batch.PredictionsOptionalTranscriptionMetadataNerPrediction>;
export declare namespace PredictionsOptionalTranscriptionMetadataNerPrediction {
    interface Raw {
        metadata?: TranscriptionMetadata.Raw | null;
        grouped_predictions: GroupedPredictionsNerPrediction.Raw[];
    }
}
