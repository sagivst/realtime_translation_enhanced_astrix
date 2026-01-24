import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { CompletedInference } from "./CompletedInference.js";
export declare const CompletedState: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.CompletedState.Raw, Hume.expressionMeasurement.batch.CompletedState>;
export declare namespace CompletedState {
    interface Raw extends CompletedInference.Raw {
    }
}
