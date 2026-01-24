import type * as Hume from "../../../../../index.js";
export interface CustomModelRequest {
    name: string;
    description?: string;
    tags?: Hume.expressionMeasurement.batch.Tag[];
}
