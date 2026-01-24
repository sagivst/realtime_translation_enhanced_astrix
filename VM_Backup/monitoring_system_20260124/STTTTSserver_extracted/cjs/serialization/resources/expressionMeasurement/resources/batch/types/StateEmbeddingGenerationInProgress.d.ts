import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { InProgress } from "./InProgress.js";
export declare const StateEmbeddingGenerationInProgress: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateEmbeddingGenerationInProgress.Raw, Hume.expressionMeasurement.batch.StateEmbeddingGenerationInProgress>;
export declare namespace StateEmbeddingGenerationInProgress {
    interface Raw extends InProgress.Raw {
    }
}
