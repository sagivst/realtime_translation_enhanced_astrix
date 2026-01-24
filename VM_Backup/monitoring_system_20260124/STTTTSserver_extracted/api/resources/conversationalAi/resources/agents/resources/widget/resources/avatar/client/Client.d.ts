import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../../../BaseClient";
import * as core from "../../../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../../../index";
export declare namespace Avatar {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Avatar {
    protected readonly _options: Avatar.Options;
    constructor(_options?: Avatar.Options);
    /**
     * Sets the avatar for an agent displayed in the widget
     *
     * @param {string} agent_id
     * @param {ElevenLabs.conversationalAi.agents.widget.BodyPostAgentAvatarV1ConvaiAgentsAgentIdAvatarPost} request
     * @param {Avatar.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     import { createReadStream } from "fs";
     *     await client.conversationalAi.agents.widget.avatar.create("agent_3701k3ttaq12ewp8b7qv5rfyszkz", {
     *         avatarFile: fs.createReadStream("/path/to/your/file")
     *     })
     */
    create(agent_id: string, request: ElevenLabs.conversationalAi.agents.widget.BodyPostAgentAvatarV1ConvaiAgentsAgentIdAvatarPost, requestOptions?: Avatar.RequestOptions): core.HttpResponsePromise<ElevenLabs.PostAgentAvatarResponseModel>;
    private __create;
}
