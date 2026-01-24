import type * as Hume from "../../../../../../api/index.js";
import * as core from "../../../../../../core/index.js";
import type * as serializers from "../../../../../index.js";
import { TaskClassification } from "./TaskClassification.js";
import { TaskRegression } from "./TaskRegression.js";
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
