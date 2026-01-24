import { Batch as FernClient } from "../../../api/resources/expressionMeasurement/resources/batch/client/Client.js";
import * as Hume from "../../../api/index.js";
import { Job } from "./Job.js";
import * as core from "../../../core/index.js";
export declare class BatchClient extends FernClient {
    startInferenceJob(request?: Hume.expressionMeasurement.batch.InferenceBaseRequest, requestOptions?: FernClient.RequestOptions): core.HttpResponsePromise<Job>;
}
