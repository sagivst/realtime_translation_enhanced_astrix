import * as Hume from "../../../api/index.mjs";
import { BatchClient } from "./BatchClient.mjs";
export declare class Job implements Hume.expressionMeasurement.batch.JobId {
    readonly jobId: string;
    private readonly client;
    constructor(jobId: string, client: BatchClient);
    awaitCompletion(timeoutInSeconds?: number): Promise<void>;
}
