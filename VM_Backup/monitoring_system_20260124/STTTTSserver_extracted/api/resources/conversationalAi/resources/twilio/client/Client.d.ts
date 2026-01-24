import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
export declare namespace Twilio {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Twilio {
    protected readonly _options: Twilio.Options;
    constructor(_options?: Twilio.Options);
    /**
     * Handle an outbound call via Twilio
     *
     * @param {ElevenLabs.conversationalAi.BodyHandleAnOutboundCallViaTwilioV1ConvaiTwilioOutboundCallPost} request
     * @param {Twilio.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.conversationalAi.twilio.outboundCall({
     *         agentId: "agent_id",
     *         agentPhoneNumberId: "agent_phone_number_id",
     *         toNumber: "to_number"
     *     })
     */
    outboundCall(request: ElevenLabs.conversationalAi.BodyHandleAnOutboundCallViaTwilioV1ConvaiTwilioOutboundCallPost, requestOptions?: Twilio.RequestOptions): core.HttpResponsePromise<ElevenLabs.TwilioOutboundCallResponse>;
    private __outboundCall;
}
