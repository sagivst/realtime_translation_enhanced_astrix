import type { BaseClientOptions } from "../../../../BaseClient.js";
import { Batch } from "../resources/batch/client/Client.js";
export declare namespace ExpressionMeasurement {
    interface Options extends BaseClientOptions {
    }
}
export declare class ExpressionMeasurement {
    protected readonly _options: ExpressionMeasurement.Options;
    protected _batch: Batch | undefined;
    constructor(_options?: ExpressionMeasurement.Options);
    get batch(): Batch;
}
