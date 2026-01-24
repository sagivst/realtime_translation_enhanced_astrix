import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient.js";
import * as core from "../../../../../../core/index.js";
import type * as Hume from "../../../../../index.js";
export declare namespace Batch {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Batch {
    protected readonly _options: Batch.Options;
    constructor(_options?: Batch.Options);
    /**
     * Sort and filter jobs.
     *
     * @param {Hume.expressionMeasurement.batch.BatchListJobsRequest} request
     * @param {Batch.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @example
     *     await client.expressionMeasurement.batch.listJobs()
     */
    listJobs(request?: Hume.expressionMeasurement.batch.BatchListJobsRequest, requestOptions?: Batch.RequestOptions): core.HttpResponsePromise<Hume.expressionMeasurement.batch.UnionJob[]>;
    private __listJobs;
    /**
     * Start a new measurement inference job.
     *
     * @param {Hume.expressionMeasurement.batch.InferenceBaseRequest} request
     * @param {Batch.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @example
     *     await client.expressionMeasurement.batch.startInferenceJob({
     *         urls: ["https://hume-tutorials.s3.amazonaws.com/faces.zip"],
     *         notify: true
     *     })
     */
    startInferenceJob(request: Hume.expressionMeasurement.batch.InferenceBaseRequest, requestOptions?: Batch.RequestOptions): core.HttpResponsePromise<Hume.expressionMeasurement.batch.JobId>;
    private __startInferenceJob;
    /**
     * Get the request details and state of a given job.
     *
     * @param {string} id - The unique identifier for the job.
     * @param {Batch.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @example
     *     await client.expressionMeasurement.batch.getJobDetails("job_id")
     */
    getJobDetails(id: string, requestOptions?: Batch.RequestOptions): core.HttpResponsePromise<Hume.expressionMeasurement.batch.UnionJob>;
    private __getJobDetails;
    /**
     * Get the JSON predictions of a completed inference job.
     *
     * @param {string} id - The unique identifier for the job.
     * @param {Batch.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @example
     *     await client.expressionMeasurement.batch.getJobPredictions("job_id")
     */
    getJobPredictions(id: string, requestOptions?: Batch.RequestOptions): core.HttpResponsePromise<Hume.expressionMeasurement.batch.UnionPredictResult[]>;
    private __getJobPredictions;
    /**
     * Get the artifacts ZIP of a completed inference job.
     */
    getJobArtifacts(id: string, requestOptions?: Batch.RequestOptions): core.HttpResponsePromise<core.BinaryResponse>;
    private __getJobArtifacts;
    /**
     * Start a new batch inference job.
     *
     * @param {Hume.expressionMeasurement.batch.BatchStartInferenceJobFromLocalFileRequest} request
     * @param {Batch.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @example
     *     import { createReadStream } from "fs";
     *     await client.expressionMeasurement.batch.startInferenceJobFromLocalFile({
     *         file: [fs.createReadStream("/path/to/your/file")]
     *     })
     */
    startInferenceJobFromLocalFile(request: Hume.expressionMeasurement.batch.BatchStartInferenceJobFromLocalFileRequest, requestOptions?: Batch.RequestOptions): core.HttpResponsePromise<Hume.expressionMeasurement.batch.JobId>;
    private __startInferenceJobFromLocalFile;
    protected _getCustomAuthorizationHeaders(): Promise<Record<string, string | undefined>>;
}
