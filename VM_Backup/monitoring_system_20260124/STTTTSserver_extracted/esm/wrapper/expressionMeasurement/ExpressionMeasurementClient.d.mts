import { ExpressionMeasurement as FernClient } from "../../api/resources/expressionMeasurement/client/Client.mjs";
import { BatchClient } from "./batch/BatchClient.mjs";
import { StreamClient } from "./streaming/StreamingClient.mjs";
export declare class ExpressionMeasurement extends FernClient {
    protected _batch: BatchClient | undefined;
    get batch(): BatchClient;
    protected _stream: StreamClient | undefined;
    get stream(): StreamClient;
}
