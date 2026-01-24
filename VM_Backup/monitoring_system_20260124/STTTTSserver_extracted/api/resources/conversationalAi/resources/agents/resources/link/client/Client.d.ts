import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
export declare namespace Link {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Link {
    protected readonly _options: Link.Options;
    constructor(_options?: Link.Options);
    /**
     * Get the current link used to share the agent with others
     *
     * @param {string} agent_id - The id of an agent. This is returned on agent creation.
     * @param {Link.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.agents.link.get("agent_3701k3ttaq12ewp8b7qv5rfyszkz")
     */
    get(agent_id: string, requestOptions?: Link.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetAgentLinkResponseModel>;
    private __get;
}
