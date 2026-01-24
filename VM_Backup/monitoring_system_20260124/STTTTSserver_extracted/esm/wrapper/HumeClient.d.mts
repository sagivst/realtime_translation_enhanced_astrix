import { HumeClient as FernClient } from "../Client.mjs";
import * as core from "../core/index.mjs";
import { ExpressionMeasurement } from "./expressionMeasurement/ExpressionMeasurementClient.mjs";
import * as environments from "../environments.mjs";
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
