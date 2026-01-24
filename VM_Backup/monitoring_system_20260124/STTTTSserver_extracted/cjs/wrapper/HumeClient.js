"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumeClient = void 0;
const Client_js_1 = require("../Client.js");
const core = __importStar(require("../core/index.js"));
const ExpressionMeasurementClient_js_1 = require("./expressionMeasurement/ExpressionMeasurementClient.js");
const version_js_1 = require("../version.js");
class HumeClient extends Client_js_1.HumeClient {
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
        options.headers = Object.assign(Object.assign({}, options.headers), { "X-Hume-Client-Name": "typescript_sdk", "X-Hume-Client-Version": version_js_1.SDK_VERSION });
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
        return ((_a = this._expressionMeasurement) !== null && _a !== void 0 ? _a : (this._expressionMeasurement = new ExpressionMeasurementClient_js_1.ExpressionMeasurement(this._options)));
    }
}
exports.HumeClient = HumeClient;
