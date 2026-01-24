import type { BaseClientOptions, BaseRequestOptions } from "../../../../BaseClient";
import * as core from "../../../../core";
import * as ElevenLabs from "../../../index";
import { Projects } from "../resources/projects/client/Client";
export declare namespace Studio {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Studio {
    protected readonly _options: Studio.Options;
    protected _projects: Projects | undefined;
    constructor(_options?: Studio.Options);
    get projects(): Projects;
    /**
     * Create and auto-convert a podcast project. Currently, the LLM cost is covered by us but you will still be charged for the audio generation. In the future, you will be charged for both the LLM and audio generation costs.
     *
     * @param {ElevenLabs.BodyCreatePodcastV1StudioPodcastsPost} request
     * @param {Studio.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.studio.createPodcast({
     *         safetyIdentifier: "safety-identifier",
     *         modelId: "eleven_multilingual_v2",
     *         mode: {
     *             type: "conversation",
     *             conversation: {
     *                 hostVoiceId: "aw1NgEzBg83R7vgmiJt6",
     *                 guestVoiceId: "aw1NgEzBg83R7vgmiJt7"
     *             }
     *         },
     *         source: {
     *             text: "This is a test podcast."
     *         }
     *     })
     */
    createPodcast(request: ElevenLabs.BodyCreatePodcastV1StudioPodcastsPost, requestOptions?: Studio.RequestOptions): core.HttpResponsePromise<ElevenLabs.PodcastProjectResponseModel>;
    private __createPodcast;
}
