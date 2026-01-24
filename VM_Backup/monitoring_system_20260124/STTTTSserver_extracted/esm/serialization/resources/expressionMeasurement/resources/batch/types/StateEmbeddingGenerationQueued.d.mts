import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { Queued } from "./Queued.mjs";
export declare const StateEmbeddingGenerationQueued: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.StateEmbeddingGenerationQueued.Raw, Hume.expressionMeasurement.batch.StateEmbeddingGenerationQueued>;
export declare namespace StateEmbeddingGenerationQueued {
    interface Raw extends Queued.Raw {
    }
}
