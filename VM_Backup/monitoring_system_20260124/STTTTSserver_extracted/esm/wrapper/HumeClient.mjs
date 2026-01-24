var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { HumeClient as FernClient } from "../Client.mjs";
import * as core from "../core/index.mjs";
import { ExpressionMeasurement } from "./expressionMeasurement/ExpressionMeasurementClient.mjs";
import * as environments from "../environments.mjs";
import { SDK_VERSION } from "../version.mjs";
export class HumeClient extends FernClient {
    constructor(_options) {
        var _a;
        let options;
        let oldEnvironment;
        (_a = _options || {}, { environment: oldEnvironment } = _a, options = __rest(_a, ["environment"]));
        // Check if both accessToken and Authorization header are provided (case-insensitive)
        if (_options.accessToken && _options.headers) {
            const hasAuthHeader = Object.keys(_options.headers).some((key) => key.toLowerCase() === "authorization");
            if (hasAuthHeader) {
                throw new Error("Cannot provide both 'accessToken' and 'headers.Authorization'. Please use only one.");
            }
        }
        if (_options.accessToken) {
            options.headers = Object.assign(Object.assign({}, options.headers), { Authorization: core.Supplier.map(_options.accessToken, (token) => `Bearer ${token}`) });
        }
        // Add telemetry headers
        options.headers = Object.assign(Object.assign({}, options.headers), { "X-Hume-Client-Name": "typescript_sdk", "X-Hume-Client-Version": SDK_VERSION });
        // Allow setting a single url http://... or https://... for environment'
        if (oldEnvironment) {
            const environment = _options.environment
                ? core.Supplier.map(_options.environment, (e) => {
                    if (typeof e === "string") {
                        if (e.startsWith("http://")) {
                            return {
                                base: e,
                                evi: e.replace("http://", "ws://") + "/v0/evi",
                                tts: e.replace("http://", "ws://") + "/v0/tts",
                                stream: e.replace("http://", "ws://") + "/v0/stream",
                            };
                        }
                        if (e.startsWith("https://")) {
                            return {
                                base: e,
                                evi: e.replace("https://", "wss://") + "/v0/evi",
                                tts: e.replace("https://", "wss://") + "/v0/tts",
                                stream: e.replace("https://", "wss://") + "/v0/stream",
                            };
                        }
                        return {
                            base: "https://" + e,
                            evi: "wss://" + e + "/v0/evi",
                            tts: "wss://" + e + "/v0/tts",
                            stream: "wss://" + e + "/v0/stream",
                        };
                    }
                    else {
                        return e;
                    }
                })
                : undefined;
            options.environment = environment;
        }
        super(options);
    }
    get expressionMeasurement() {
        var _a;
        return ((_a = this._expressionMeasurement) !== null && _a !== void 0 ? _a : (this._expressionMeasurement = new ExpressionMeasurement(this._options)));
    }
}
