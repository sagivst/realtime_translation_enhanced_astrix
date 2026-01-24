import type * as Hume from "../../../../../index.mjs";
export interface CustomModelRequest {
    name: string;
    description?: string;
    tags?: Hume.expressionMeasurement.batch.Tag[];
}
