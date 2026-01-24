import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
export declare namespace ApprovalPolicy {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class ApprovalPolicy {
    protected readonly _options: ApprovalPolicy.Options;
    constructor(_options?: ApprovalPolicy.Options);
    /**
     * Update the approval policy configuration for an MCP server. DEPRECATED: Use PATCH /mcp-servers/{id} endpoint instead.
     *
     * @param {string} mcp_server_id - ID of the MCP Server.
     * @param {ElevenLabs.conversationalAi.mcpServers.McpApprovalPolicyUpdateRequestModel} request
     * @param {ApprovalPolicy.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.mcpServers.approvalPolicy.update("mcp_server_id", {
     *         approvalPolicy: "auto_approve_all"
     *     })
     */
    update(mcp_server_id: string, request: ElevenLabs.conversationalAi.mcpServers.McpApprovalPolicyUpdateRequestModel, requestOptions?: ApprovalPolicy.RequestOptions): core.HttpResponsePromise<ElevenLabs.McpServerResponseModel>;
    private __update;
}
