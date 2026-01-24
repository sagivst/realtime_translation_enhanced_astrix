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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchClient = void 0;
const Client_js_1 = require("../../../api/resources/expressionMeasurement/resources/batch/client/Client.js");
const Job_js_1 = require("./Job.js");
const core = __importStar(require("../../../core/index.js"));
class BatchClient extends Client_js_1.Batch {
    // This just wraps the return value of the base class's `startInferenceJob` method
    // and returns a `Job` instance (has helper functions to await the job's result) instead of a raw job ID.
    startInferenceJob(request = {}, requestOptions) {
        return core.HttpResponsePromise.fromPromise(super
            .startInferenceJob(request, requestOptions)
            .withRawResponse()
            .then((result) => {
            return { data: new Job_js_1.Job(result.data.jobId, this), rawResponse: result.rawResponse };
        }));
    }
}
exports.BatchClient = BatchClient;
