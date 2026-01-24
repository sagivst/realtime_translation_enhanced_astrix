import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
export declare namespace Invocations {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Invocations {
    protected readonly _options: Invocations.Options;
    constructor(_options?: Invocations.Options);
    /**
     * Lists all test invocations with pagination support and optional search filtering.
     *
     * @param {ElevenLabs.conversationalAi.tests.InvocationsListRequest} request
     * @param {Invocations.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.tests.invocations.list({
     *         agentId: "agent_id",
     *         pageSize: 1,
     *         cursor: "cursor"
     *     })
     */
    list(request: ElevenLabs.conversationalAi.tests.InvocationsListRequest, requestOptions?: Invocations.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetTestInvocationsPageResponseModel>;
    private __list;
    /**
     * Gets a test invocation by ID.
     *
     * @param {string} test_invocation_id - The id of a test invocation. This is returned when tests are run.
     * @param {Invocations.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.tests.invocations.get("test_invocation_id")
     */
    get(test_invocation_id: string, requestOptions?: Invocations.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetTestSuiteInvocationResponseModel>;
    private __get;
    /**
     * Resubmits specific test runs from a test invocation.
     *
     * @param {string} test_invocation_id - The id of a test invocation. This is returned when tests are run.
     * @param {ElevenLabs.conversationalAi.tests.ResubmitTestsRequestModel} request
     * @param {Invocations.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.tests.invocations.resubmit("test_invocation_id", {
     *         testRunIds: ["test_run_ids"],
     *         agentId: "agent_id"
     *     })
     */
    resubmit(test_invocation_id: string, request: ElevenLabs.conversationalAi.tests.ResubmitTestsRequestModel, requestOptions?: Invocations.RequestOptions): core.HttpResponsePromise<unknown>;
    private __resubmit;
}
