import { EmpathicVoice } from "./api/resources/empathicVoice/client/Client.js";
import { ExpressionMeasurement } from "./api/resources/expressionMeasurement/client/Client.js";
import { Tts } from "./api/resources/tts/client/Client.js";
import type { BaseClientOptions, BaseRequestOptions } from "./BaseClient.js";
export declare namespace HumeClient {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class HumeClient {
    protected readonly _options: HumeClient.Options;
    protected _tts: Tts | undefined;
    protected _empathicVoice: EmpathicVoice | undefined;
    protected _expressionMeasurement: ExpressionMeasurement | undefined;
    constructor(_options?: HumeClient.Options);
    get tts(): Tts;
    get empathicVoice(): EmpathicVoice;
    get expressionMeasurement(): ExpressionMeasurement;
}
