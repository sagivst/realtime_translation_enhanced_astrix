import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
export declare namespace SipTrunk {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class SipTrunk {
    protected readonly _options: SipTrunk.Options;
    constructor(_options?: SipTrunk.Options);
    /**
     * Handle an outbound call via SIP trunk
     *
     * @param {ElevenLabs.conversationalAi.BodyHandleAnOutboundCallViaSipTrunkV1ConvaiSipTrunkOutboundCallPost} request
     * @param {SipTrunk.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.sipTrunk.outboundCall({
     *         agentId: "agent_id",
     *         agentPhoneNumberId: "agent_phone_number_id",
     *         toNumber: "to_number"
     *     })
     */
    outboundCall(request: ElevenLabs.conversationalAi.BodyHandleAnOutboundCallViaSipTrunkV1ConvaiSipTrunkOutboundCallPost, requestOptions?: SipTrunk.RequestOptions): core.HttpResponsePromise<ElevenLabs.SipTrunkOutboundCallResponse>;
    private __outboundCall;
}
