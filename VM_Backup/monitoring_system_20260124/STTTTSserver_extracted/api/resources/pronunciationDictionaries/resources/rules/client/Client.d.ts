import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
export declare namespace Rules {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Rules {
    protected readonly _options: Rules.Options;
    constructor(_options?: Rules.Options);
    /**
     * Add rules to the pronunciation dictionary
     *
     * @param {string} pronunciation_dictionary_id - The id of the pronunciation dictionary
     * @param {ElevenLabs.pronunciationDictionaries.PronunciationDictionary} request
     * @param {Rules.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.pronunciationDictionaries.rules.add("21m00Tcm4TlvDq8ikWAM", {
     *         rules: [{
     *                 type: "alias",
     *                 stringToReplace: "Thailand",
     *                 alias: "tie-land"
     *             }]
     *     })
     */
    add(pronunciation_dictionary_id: string, request: ElevenLabs.pronunciationDictionaries.PronunciationDictionary, requestOptions?: Rules.RequestOptions): core.HttpResponsePromise<ElevenLabs.PronunciationDictionaryRulesResponseModel>;
    private __add;
    /**
     * Remove rules from the pronunciation dictionary
     *
     * @param {string} pronunciation_dictionary_id - The id of the pronunciation dictionary
     * @param {ElevenLabs.pronunciationDictionaries.RemovePronunciationDictionaryRulesRequest} request
     * @param {Rules.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.pronunciationDictionaries.rules.remove("21m00Tcm4TlvDq8ikWAM", {
     *         ruleStrings: ["rule_strings"]
     *     })
     */
    remove(pronunciation_dictionary_id: string, request: ElevenLabs.pronunciationDictionaries.RemovePronunciationDictionaryRulesRequest, requestOptions?: Rules.RequestOptions): core.HttpResponsePromise<ElevenLabs.PronunciationDictionaryRulesResponseModel>;
    private __remove;
}
