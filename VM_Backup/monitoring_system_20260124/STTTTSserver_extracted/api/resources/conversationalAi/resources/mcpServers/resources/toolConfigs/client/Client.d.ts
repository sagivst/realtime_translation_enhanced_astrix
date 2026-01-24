import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
export declare namespace ToolConfigs {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class ToolConfigs {
    protected readonly _options: ToolConfigs.Options;
    constructor(_options?: ToolConfigs.Options);
    /**
     * Create configuration overrides for a specific MCP tool.
     *
     * @param {string} mcp_server_id - ID of the MCP Server.
     * @param {ElevenLabs.conversationalAi.mcpServers.McpToolConfigOverrideCreateRequestModel} request
     * @param {ToolConfigs.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.ConflictError}
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.mcpServers.toolConfigs.create("mcp_server_id", {
     *         toolName: "tool_name"
     *     })
     */
    create(mcp_server_id: string, request: ElevenLabs.conversationalAi.mcpServers.McpToolConfigOverrideCreateRequestModel, requestOptions?: ToolConfigs.RequestOptions): core.HttpResponsePromise<ElevenLabs.McpServerResponseModel>;
    private __create;
    /**
     * Retrieve configuration overrides for a specific MCP tool.
     *
     * @param {string} mcp_server_id - ID of the MCP Server.
     * @param {string} tool_name - Name of the MCP tool to retrieve config overrides for.
     * @param {ToolConfigs.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.NotFoundError}
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.mcpServers.toolConfigs.get("mcp_server_id", "tool_name")
     */
    get(mcp_server_id: string, tool_name: string, requestOptions?: ToolConfigs.RequestOptions): core.HttpResponsePromise<ElevenLabs.McpToolConfigOverride>;
    private __get;
    /**
     * Remove configuration overrides for a specific MCP tool.
     *
     * @param {string} mcp_server_id - ID of the MCP Server.
     * @param {string} tool_name - Name of the MCP tool to remove config overrides for.
     * @param {ToolConfigs.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.mcpServers.toolConfigs.delete("mcp_server_id", "tool_name")
     */
    delete(mcp_server_id: string, tool_name: string, requestOptions?: ToolConfigs.RequestOptions): core.HttpResponsePromise<ElevenLabs.McpServerResponseModel>;
    private __delete;
    /**
     * Update configuration overrides for a specific MCP tool.
     *
     * @param {string} mcp_server_id - ID of the MCP Server.
     * @param {string} tool_name - Name of the MCP tool to update config overrides for.
     * @param {ElevenLabs.conversationalAi.mcpServers.McpToolConfigOverrideUpdateRequestModel} request
     * @param {ToolConfigs.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.NotFoundError}
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.mcpServers.toolConfigs.update("mcp_server_id", "tool_name")
     */
    update(mcp_server_id: string, tool_name: string, request?: ElevenLabs.conversationalAi.mcpServers.McpToolConfigOverrideUpdateRequestModel, requestOptions?: ToolConfigs.RequestOptions): core.HttpResponsePromise<ElevenLabs.McpServerResponseModel>;
    private __update;
}
