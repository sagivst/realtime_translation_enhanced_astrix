import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
export declare namespace Tools {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Tools {
    protected readonly _options: Tools.Options;
    constructor(_options?: Tools.Options);
    /**
     * Retrieve all tools available for a specific MCP server configuration.
     *
     * @param {string} mcp_server_id - ID of the MCP Server.
     * @param {Tools.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.mcpServers.tools.list("mcp_server_id")
     */
    list(mcp_server_id: string, requestOptions?: Tools.RequestOptions): core.HttpResponsePromise<ElevenLabs.ListMcpToolsResponseModel>;
    private __list;
}
