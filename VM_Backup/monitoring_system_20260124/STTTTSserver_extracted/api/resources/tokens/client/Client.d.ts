import type { BaseClientOptions } from "../../../../BaseClient";
import { SingleUse } from "../resources/singleUse/client/Client";
export declare namespace Tokens {
    interface Options extends BaseClientOptions {
    }
}
export declare class Tokens {
    protected readonly _options: Tokens.Options;
    protected _singleUse: SingleUse | undefined;
    constructor(_options?: Tokens.Options);
    get singleUse(): SingleUse;
}
