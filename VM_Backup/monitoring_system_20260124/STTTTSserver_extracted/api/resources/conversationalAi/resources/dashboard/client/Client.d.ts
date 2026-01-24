import type { BaseClientOptions } from "../../../../../../BaseClient";
import { Settings } from "../resources/settings/client/Client";
export declare namespace Dashboard {
    interface Options extends BaseClientOptions {
    }
}
export declare class Dashboard {
    protected readonly _options: Dashboard.Options;
    protected _settings: Settings | undefined;
    constructor(_options?: Dashboard.Options);
    get settings(): Settings;
}
