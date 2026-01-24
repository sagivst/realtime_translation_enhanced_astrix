import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
export declare namespace Usage {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Usage {
    protected readonly _options: Usage.Options;
    constructor(_options?: Usage.Options);
    /**
     * Returns the usage metrics for the current user or the entire workspace they are part of. The response provides a time axis based on the specified aggregation interval (default: day), with usage values for each interval along that axis. Usage is broken down by the selected breakdown type. For example, breakdown type "voice" will return the usage of each voice for each interval along the time axis.
     *
     * @param {ElevenLabs.UsageGetRequest} request
     * @param {Usage.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.usage.get({
     *         startUnix: 1,
     *         endUnix: 1,
     *         includeWorkspaceMetrics: true,
     *         breakdownType: "none",
     *         aggregationInterval: "hour",
     *         aggregationBucketSize: 1,
     *         metric: "credits"
     *     })
     */
    get(request: ElevenLabs.UsageGetRequest, requestOptions?: Usage.RequestOptions): core.HttpResponsePromise<ElevenLabs.UsageCharactersResponseModel>;
    private __get;
}
