var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export { base64Decode } from "./base64Decode.mjs";
export { base64Encode } from "./base64Encode.mjs";
export { convertBase64ToBlob } from "./convertBase64ToBlob.mjs";
export { convertBlobToBase64 } from "./convertBlobToBase64.mjs";
export { ensureSingleValidAudioTrack } from "./ensureSingleValidAudioTrack.mjs";
export { checkForAudioTracks } from "./checkForAudioTracks.mjs";
export { fetchAccessToken } from "./fetchAccessToken.mjs";
export { getAudioStream } from "./getAudioStream.mjs";
export { MimeType, getBrowserSupportedMimeType } from "./getBrowserSupportedMimeType.mjs";
export { HumeClient } from "./HumeClient.mjs";
export { ExpressionMeasurement } from "./expressionMeasurement/ExpressionMeasurementClient.mjs";
export { EVIWebAudioPlayer } from "./EVIWebAudioPlayer.mjs";
export { collate } from "./collate.mjs";
// SilenceFiller extends from Node.JS Readable -- this should not be exported in non-nodeJS environments. Otherwise the bundle will crash in the browser.
export const createSilenceFiller = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (typeof process === "undefined" || !((_a = process.versions) === null || _a === void 0 ? void 0 : _a.node)) {
        throw new Error("SilenceFiller is only available in Node.js environments");
    }
    const { SilenceFiller } = yield import("./SilenceFiller.mjs");
    return SilenceFiller;
});
