import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
export declare const Granularity: core.serialization.Schema<serializers.expressionMeasurement.batch.Granularity.Raw, Hume.expressionMeasurement.batch.Granularity>;
export declare namespace Granularity {
    type Raw = "word" | "sentence" | "utterance" | "conversational_turn";
}
