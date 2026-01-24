import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { GroupedPredictionsNerPrediction } from "./GroupedPredictionsNerPrediction.mjs";
import { TranscriptionMetadata } from "./TranscriptionMetadata.mjs";
export declare const PredictionsOptionalTranscriptionMetadataNerPrediction: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.PredictionsOptionalTranscriptionMetadataNerPrediction.Raw, Hume.expressionMeasurement.batch.PredictionsOptionalTranscriptionMetadataNerPrediction>;
export declare namespace PredictionsOptionalTranscriptionMetadataNerPrediction {
    interface Raw {
        metadata?: TranscriptionMetadata.Raw | null;
        grouped_predictions: GroupedPredictionsNerPrediction.Raw[];
    }
}
