import type { BaseClientOptions } from "../../../../../../BaseClient";
import { Audio } from "../resources/audio/client/Client";
export declare namespace Samples {
    interface Options extends BaseClientOptions {
    }
}
export declare class Samples {
    protected readonly _options: Samples.Options;
    protected _audio: Audio | undefined;
    constructor(_options?: Samples.Options);
    get audio(): Audio;
}
