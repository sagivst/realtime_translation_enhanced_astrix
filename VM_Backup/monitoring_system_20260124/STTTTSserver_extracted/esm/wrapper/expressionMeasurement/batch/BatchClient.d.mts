import { Batch as FernClient } from "../../../api/resources/expressionMeasurement/resources/batch/client/Client.mjs";
import * as Hume from "../../../api/index.mjs";
import { Job } from "./Job.mjs";
import * as core from "../../../core/index.mjs";
export declare class BatchClient extends FernClient {
    startInferenceJob(request?: Hume.expressionMeasurement.batch.InferenceBaseRequest, requestOptions?: FernClient.RequestOptions): core.HttpResponsePromise<Job>;
}
