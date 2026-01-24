import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { InProgress } from "./InProgress.mjs";
export declare const StateEmbeddingGenerationInProgress: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateEmbeddingGenerationInProgress.Raw, Hume.expressionMeasurement.batch.StateEmbeddingGenerationInProgress>;
export declare namespace StateEmbeddingGenerationInProgress {
    interface Raw extends InProgress.Raw {
    }
}
