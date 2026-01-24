"use strict";
/** THIS FILE IS MANUALLY MAINTAINED: see .fernignore */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chat = void 0;
const environments = __importStar(require("../../../../../../environments.js"));
const core = __importStar(require("../../../../../../core/index.js"));
const headers_js_1 = require("../../../../../../core/headers.js");
const serializers = __importStar(require("../../../../../../serialization/index.js"));
const Socket_js_1 = require("./Socket.js");
class Chat {
    constructor(_options = {}) {
        this._options = _options;
    }
    connect(args = {}) {
        var _a, _b;
        const { accessToken, configId, configVersion, eventLimit, resumedChatGroupId, verboseTranscription, voiceId, apiKey, sessionSettings, queryParams, headers, debug, reconnectAttempts, allowConnection, } = args;
        const _queryParams = {};
        if (accessToken != null) {
            _queryParams["access_token"] = accessToken;
        }
        if (configId != null) {
            _queryParams["config_id"] = configId;
        }
        if (configVersion != null) {
            _queryParams["config_version"] =
                typeof configVersion === "number" ? configVersion.toString() : configVersion;
        }
        if (eventLimit != null) {
            _queryParams["event_limit"] = eventLimit.toString();
        }
        if (resumedChatGroupId != null) {
            _queryParams["resumed_chat_group_id"] = resumedChatGroupId;
        }
        if (verboseTranscription != null) {
            _queryParams["verbose_transcription"] = verboseTranscription.toString();
        }
        if (voiceId != null) {
            _queryParams["voice_id"] = voiceId;
        }
        if (apiKey != null) {
            _queryParams["api_key"] = apiKey;
        }
        if (allowConnection != null) {
            _queryParams["allow_connection"] = allowConnection === true ? "true" : "false";
        }
        if (sessionSettings != null) {
            _queryParams["session_settings"] = serializers.empathicVoice.ConnectSessionSettings.jsonOrThrow(sessionSettings, {
                unrecognizedObjectKeys: "passthrough",
                allowUnrecognizedUnionMembers: true,
                allowUnrecognizedEnumValues: true,
                omitUndefined: true,
                breadcrumbsPrefix: ["request", "sessionSettings"],
            });
        }
        // Merge in any additional query parameters
        if (queryParams != null) {
            for (const [name, value] of Object.entries(queryParams)) {
                _queryParams[name] = value;
            }
        }
        let _headers = (0, headers_js_1.mergeHeaders)((0, headers_js_1.mergeOnlyDefinedHeaders)(Object.assign({}, this._getCustomAuthorizationHeaders())), headers);
        const socket = new core.ReconnectingWebSocket({
            url: core.url.join((_a = core.Supplier.get(this._options["baseUrl"])) !== null && _a !== void 0 ? _a : ((_b = core.Supplier.get(this._options["environment"])) !== null && _b !== void 0 ? _b : environments.HumeEnvironment.Prod).evi, "/chat"),
            protocols: [],
            queryParameters: _queryParams,
            headers: _headers,
            options: { debug: debug !== null && debug !== void 0 ? debug : false, maxRetries: reconnectAttempts !== null && reconnectAttempts !== void 0 ? reconnectAttempts : 30 },
        });
        return new Socket_js_1.ChatSocket({ socket });
    }
    _getCustomAuthorizationHeaders() {
        var _a;
        const apiKeyValue = core.Supplier.get(this._options.apiKey);
        // This `authHeaderValue` is manually added as if you don't provide it it will
        // be omitted from the headers which means it won't reach the logic in ws.ts that
        // extracts values from the headers and adds them to query parameters.
        const authHeaderValue = core.Supplier.get((_a = this._options.headers) === null || _a === void 0 ? void 0 : _a.authorization);
        return { "X-Hume-Api-Key": apiKeyValue, Authorization: authHeaderValue };
    }
}
exports.Chat = Chat;
