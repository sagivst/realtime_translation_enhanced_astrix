import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
export declare namespace Language {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Language {
    protected readonly _options: Language.Options;
    constructor(_options?: Language.Options);
    /**
     * Adds the given ElevenLab Turbo V2/V2.5 language code to the resource. Does not automatically generate transcripts/translations/audio.
     *
     * @param {string} dubbing_id - ID of the dubbing project.
     * @param {ElevenLabs.dubbing.resource.BodyAddALanguageToTheResourceV1DubbingResourceDubbingIdLanguagePost} request
     * @param {Language.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.dubbing.resource.language.add("dubbing_id")
     */
    add(dubbing_id: string, request?: ElevenLabs.dubbing.resource.BodyAddALanguageToTheResourceV1DubbingResourceDubbingIdLanguagePost, requestOptions?: Language.RequestOptions): core.HttpResponsePromise<ElevenLabs.LanguageAddedResponse>;
    private __add;
}
