import { HumeClient as FernClient } from "../Client.js";
import * as core from "../core/index.js";
import { ExpressionMeasurement } from "./expressionMeasurement/ExpressionMeasurementClient.js";
import * as environments from "../environments.js";
export declare namespace HumeClient {
    type Options = Omit<FernClient.Options, "environment"> & {
        accessToken?: string;
    } & ({
        accessToken: NonNullable<core.Supplier<string>>;
    } | {
        apiKey: NonNullable<FernClient.Options["apiKey"]>;
    }) & {
        environment?: core.Supplier<environments.HumeEnvironment | environments.HumeEnvironmentUrls | string>;
    };
}
export declare class HumeClient extends FernClient {
    constructor(_options: HumeClient.Options);
    protected _expressionMeasurement: ExpressionMeasurement | undefined;
    get expressionMeasurement(): ExpressionMeasurement;
}
