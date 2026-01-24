import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { ValidationArgs } from "./ValidationArgs.js";
export declare const EvaluationArgs: core.serialization.ObjectSchema<serializers.expressionMeasurement.batch.EvaluationArgs.Raw, Hume.expressionMeasurement.batch.EvaluationArgs>;
export declare namespace EvaluationArgs {
    interface Raw {
        validation?: ValidationArgs.Raw | null;
    }
}
