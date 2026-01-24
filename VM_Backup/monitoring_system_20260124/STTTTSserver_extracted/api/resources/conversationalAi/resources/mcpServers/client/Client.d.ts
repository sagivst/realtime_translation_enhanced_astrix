import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
import { ApprovalPolicy } from "../resources/approvalPolicy/client/Client";
import { ToolApprovals } from "../resources/toolApprovals/client/Client";
import { ToolConfigs } from "../resources/toolConfigs/client/Client";
import { Tools } from "../resources/tools/client/Client";
export declare namespace McpServers {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class McpServers {
    protected readonly _options: McpServers.Options;
    protected _tools: Tools | undefined;
    protected _approvalPolicy: ApprovalPolicy | undefined;
    protected _toolApprovals: ToolApprovals | undefined;
    protected _toolConfigs: ToolConfigs | undefined;
    constructor(_options?: McpServers.Options);
    get tools(): Tools;
    get approvalPolicy(): ApprovalPolicy;
    get toolApprovals(): ToolApprovals;
    get toolConfigs(): ToolConfigs;
    /**
     * Retrieve all MCP server configurations available in the workspace.
     *
     * @param {McpServers.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.mcpServers.list()
     */
    list(requestOptions?: McpServers.RequestOptions): core.HttpResponsePromise<ElevenLabs.McpServersResponseModel>;
    private __list;
    /**
     * Create a new MCP server configuration in the workspace.
     *
     * @param {ElevenLabs.conversationalAi.McpServerRequestModel} request
     * @param {McpServers.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.mcpServers.create({
     *         config: {
     *             url: "url",
     *             name: "name"
     *         }
     *     })
     */
    create(request: ElevenLabs.conversationalAi.McpServerRequestModel, requestOptions?: McpServers.RequestOptions): core.HttpResponsePromise<ElevenLabs.McpServerResponseModel>;
    private __create;
    /**
     * Retrieve a specific MCP server configuration from the workspace.
     *
     * @param {string} mcp_server_id - ID of the MCP Server.
     * @param {McpServers.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.mcpServers.get("mcp_server_id")
     */
    get(mcp_server_id: string, requestOptions?: McpServers.RequestOptions): core.HttpResponsePromise<ElevenLabs.McpServerResponseModel>;
    private __get;
    /**
     * Delete a specific MCP server configuration from the workspace.
     *
     * @param {string} mcp_server_id - ID of the MCP Server.
     * @param {McpServers.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.mcpServers.delete("mcp_server_id")
     */
    delete(mcp_server_id: string, requestOptions?: McpServers.RequestOptions): core.HttpResponsePromise<unknown>;
    private __delete;
    /**
     * Update the configuration settings for an MCP server.
     *
     * @param {string} mcp_server_id - ID of the MCP Server.
     * @param {ElevenLabs.conversationalAi.McpServerConfigUpdateRequestModel} request
     * @param {McpServers.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.mcpServers.update("mcp_server_id")
     */
    update(mcp_server_id: string, request?: ElevenLabs.conversationalAi.McpServerConfigUpdateRequestModel, requestOptions?: McpServers.RequestOptions): core.HttpResponsePromise<ElevenLabs.McpServerResponseModel>;
    private __update;
}
