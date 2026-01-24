import * as Hume from "../../../api/index.js";
import { BatchClient } from "./BatchClient.js";
export declare class Job implements Hume.expressionMeasurement.batch.JobId {
    readonly jobId: string;
    private readonly client;
    constructor(jobId: string, client: BatchClient);
    awaitCompletion(timeoutInSeconds?: number): Promise<void>;
}
