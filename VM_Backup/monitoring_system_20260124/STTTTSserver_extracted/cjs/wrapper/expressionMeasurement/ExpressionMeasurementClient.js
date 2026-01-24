"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressionMeasurement = void 0;
const Client_js_1 = require("../../api/resources/expressionMeasurement/client/Client.js");
const BatchClient_js_1 = require("./batch/BatchClient.js");
const StreamingClient_js_1 = require("./streaming/StreamingClient.js");
class ExpressionMeasurement extends Client_js_1.ExpressionMeasurement {
    // BatchClient here is overridden from the generated version, we wrap expression measurement jobs in
    // a helper that makes it easier to await the result of a job.
    get batch() {
        var _a;
        return ((_a = this._batch) !== null && _a !== void 0 ? _a : (this._batch = new BatchClient_js_1.BatchClient(this._options)));
    }
    get stream() {
        var _a;
        return ((_a = this._stream) !== null && _a !== void 0 ? _a : (this._stream = new StreamingClient_js_1.StreamClient(this._options)));
    }
}
exports.ExpressionMeasurement = ExpressionMeasurement;
