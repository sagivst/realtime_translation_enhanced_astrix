import type * as Hume from "../../../../../index.mjs";
export type Task = Hume.expressionMeasurement.batch.Task.Classification | Hume.expressionMeasurement.batch.Task.Regression;
export declare namespace Task {
    interface Classification extends Hume.expressionMeasurement.batch.TaskClassification {
        type: "classification";
    }
    interface Regression extends Hume.expressionMeasurement.batch.TaskRegression {
        type: "regression";
    }
}
