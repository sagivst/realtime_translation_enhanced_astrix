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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSilenceFiller = exports.collate = exports.EVIWebAudioPlayer = exports.ExpressionMeasurement = exports.HumeClient = exports.getBrowserSupportedMimeType = exports.MimeType = exports.getAudioStream = exports.fetchAccessToken = exports.checkForAudioTracks = exports.ensureSingleValidAudioTrack = exports.convertBlobToBase64 = exports.convertBase64ToBlob = exports.base64Encode = exports.base64Decode = void 0;
var base64Decode_js_1 = require("./base64Decode.js");
Object.defineProperty(exports, "base64Decode", { enumerable: true, get: function () { return base64Decode_js_1.base64Decode; } });
var base64Encode_js_1 = require("./base64Encode.js");
Object.defineProperty(exports, "base64Encode", { enumerable: true, get: function () { return base64Encode_js_1.base64Encode; } });
var convertBase64ToBlob_js_1 = require("./convertBase64ToBlob.js");
Object.defineProperty(exports, "convertBase64ToBlob", { enumerable: true, get: function () { return convertBase64ToBlob_js_1.convertBase64ToBlob; } });
var convertBlobToBase64_js_1 = require("./convertBlobToBase64.js");
Object.defineProperty(exports, "convertBlobToBase64", { enumerable: true, get: function () { return convertBlobToBase64_js_1.convertBlobToBase64; } });
var ensureSingleValidAudioTrack_js_1 = require("./ensureSingleValidAudioTrack.js");
Object.defineProperty(exports, "ensureSingleValidAudioTrack", { enumerable: true, get: function () { return ensureSingleValidAudioTrack_js_1.ensureSingleValidAudioTrack; } });
var checkForAudioTracks_js_1 = require("./checkForAudioTracks.js");
Object.defineProperty(exports, "checkForAudioTracks", { enumerable: true, get: function () { return checkForAudioTracks_js_1.checkForAudioTracks; } });
var fetchAccessToken_js_1 = require("./fetchAccessToken.js");
Object.defineProperty(exports, "fetchAccessToken", { enumerable: true, get: function () { return fetchAccessToken_js_1.fetchAccessToken; } });
var getAudioStream_js_1 = require("./getAudioStream.js");
Object.defineProperty(exports, "getAudioStream", { enumerable: true, get: function () { return getAudioStream_js_1.getAudioStream; } });
var getBrowserSupportedMimeType_js_1 = require("./getBrowserSupportedMimeType.js");
Object.defineProperty(exports, "MimeType", { enumerable: true, get: function () { return getBrowserSupportedMimeType_js_1.MimeType; } });
Object.defineProperty(exports, "getBrowserSupportedMimeType", { enumerable: true, get: function () { return getBrowserSupportedMimeType_js_1.getBrowserSupportedMimeType; } });
var HumeClient_js_1 = require("./HumeClient.js");
Object.defineProperty(exports, "HumeClient", { enumerable: true, get: function () { return HumeClient_js_1.HumeClient; } });
var ExpressionMeasurementClient_js_1 = require("./expressionMeasurement/ExpressionMeasurementClient.js");
Object.defineProperty(exports, "ExpressionMeasurement", { enumerable: true, get: function () { return ExpressionMeasurementClient_js_1.ExpressionMeasurement; } });
var EVIWebAudioPlayer_js_1 = require("./EVIWebAudioPlayer.js");
Object.defineProperty(exports, "EVIWebAudioPlayer", { enumerable: true, get: function () { return EVIWebAudioPlayer_js_1.EVIWebAudioPlayer; } });
var collate_js_1 = require("./collate.js");
Object.defineProperty(exports, "collate", { enumerable: true, get: function () { return collate_js_1.collate; } });
// SilenceFiller extends from Node.JS Readable -- this should not be exported in non-nodeJS environments. Otherwise the bundle will crash in the browser.
const createSilenceFiller = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (typeof process === "undefined" || !((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node)) {
        throw new Error("SilenceFiller is only available in Node.js environments");
    }
    const { SilenceFiller } = yield Promise.resolve().then(() => __importStar(require("./SilenceFiller.js")));
    return SilenceFiller;
});
exports.createSilenceFiller = createSilenceFiller;
