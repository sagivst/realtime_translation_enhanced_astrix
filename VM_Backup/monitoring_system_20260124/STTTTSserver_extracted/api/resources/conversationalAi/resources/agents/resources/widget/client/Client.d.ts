import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
import { Avatar } from "../resources/avatar/client/Client";
export declare namespace Widget {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Widget {
    protected readonly _options: Widget.Options;
    protected _avatar: Avatar | undefined;
    constructor(_options?: Widget.Options);
    get avatar(): Avatar;
    /**
     * Retrieve the widget configuration for an agent
     *
     * @param {string} agent_id - The id of an agent. This is returned on agent creation.
     * @param {ElevenLabs.conversationalAi.agents.WidgetGetRequest} request
     * @param {Widget.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.agents.widget.get("agent_3701k3ttaq12ewp8b7qv5rfyszkz", {
     *         conversationSignature: "conversation_signature"
     *     })
     */
    get(agent_id: string, request?: ElevenLabs.conversationalAi.agents.WidgetGetRequest, requestOptions?: Widget.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetAgentEmbedResponseModel>;
    private __get;
}
