import { ExpressionMeasurement as FernClient } from "../../api/resources/expressionMeasurement/client/Client.js";
import { BatchClient } from "./batch/BatchClient.js";
import { StreamClient } from "./streaming/StreamingClient.js";
export declare class ExpressionMeasurement extends FernClient {
    protected _batch: BatchClient | undefined;
    get batch(): BatchClient;
    protected _stream: StreamClient | undefined;
    get stream(): StreamClient;
}
