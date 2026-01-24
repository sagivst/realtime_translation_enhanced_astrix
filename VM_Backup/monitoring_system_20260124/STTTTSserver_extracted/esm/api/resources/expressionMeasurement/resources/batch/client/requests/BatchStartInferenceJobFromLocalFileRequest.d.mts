import type * as core from "../../../../../../../core/index.mjs";
import type * as Hume from "../../../../../../index.mjs";
/**
 * @example
 *     {
 *         file: [fs.createReadStream("/path/to/your/file")]
 *     }
 */
export interface BatchStartInferenceJobFromLocalFileRequest {
    /** Stringified JSON object containing the inference job configuration. */
    json?: Hume.expressionMeasurement.batch.InferenceBaseRequest;
    /**
     * Local media files (see recommended input filetypes) to be processed.
     *
     * If you wish to supply more than 100 files, consider providing them as an archive (`.zip`, `.tar.gz`, `.tar.bz2`, `.tar.xz`).
     */
    file: core.file.Uploadable[];
}
