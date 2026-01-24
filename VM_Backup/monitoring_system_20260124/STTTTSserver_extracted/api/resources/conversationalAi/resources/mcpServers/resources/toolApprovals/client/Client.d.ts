import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
export declare namespace ToolApprovals {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class ToolApprovals {
    protected readonly _options: ToolApprovals.Options;
    constructor(_options?: ToolApprovals.Options);
    /**
     * Add approval for a specific MCP tool when using per-tool approval mode.
     *
     * @param {string} mcp_server_id - ID of the MCP Server.
     * @param {ElevenLabs.conversationalAi.mcpServers.McpToolAddApprovalRequestModel} request
     * @param {ToolApprovals.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.mcpServers.toolApprovals.create("mcp_server_id", {
     *         toolName: "tool_name",
     *         toolDescription: "tool_description"
     *     })
     */
    create(mcp_server_id: string, request: ElevenLabs.conversationalAi.mcpServers.McpToolAddApprovalRequestModel, requestOptions?: ToolApprovals.RequestOptions): core.HttpResponsePromise<ElevenLabs.McpServerResponseModel>;
    private __create;
    /**
     * Remove approval for a specific MCP tool when using per-tool approval mode.
     *
     * @param {string} mcp_server_id - ID of the MCP Server.
     * @param {string} tool_name - Name of the MCP tool to remove approval for.
     * @param {ToolApprovals.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.mcpServers.toolApprovals.delete("mcp_server_id", "tool_name")
     */
    delete(mcp_server_id: string, tool_name: string, requestOptions?: ToolApprovals.RequestOptions): core.HttpResponsePromise<ElevenLabs.McpServerResponseModel>;
    private __delete;
}
