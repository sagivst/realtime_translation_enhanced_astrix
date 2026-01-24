import type * as Hume from "../../../../../../api/index.mjs";
import * as core from "../../../../../../core/index.mjs";
import type * as serializers from "../../../../../index.mjs";
import { TaskClassification } from "./TaskClassification.mjs";
import { TaskRegression } from "./TaskRegression.mjs";
export declare const Task: core.serialization.Schema<serializers.expressionMeasurement.batch.Task.Raw, Hume.expressionMeasurement.batch.Task>;
export declare namespace Task {
    type Raw = Task.Classification | Task.Regression;
    interface Classification extends TaskClassification.Raw {
        type: "classification";
    }
    interface Regression extends TaskRegression.Raw {
        type: "regression";
    }
}
