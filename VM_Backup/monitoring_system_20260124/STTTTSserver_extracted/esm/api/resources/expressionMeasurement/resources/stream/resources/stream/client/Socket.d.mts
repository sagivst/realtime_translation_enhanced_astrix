import * as core from "../../../../../../../../core/index.mjs";
import type * as Hume from "../../../../../../../index.mjs";
export declare namespace StreamSocket {
    interface Args {
        socket: core.ReconnectingWebSocket;
    }
    type Response = Hume.expressionMeasurement.stream.SubscribeEvent;
    type EventHandlers = {
        open?: () => void;
        message?: (message: Response) => void;
        close?: (event: core.CloseEvent) => void;
        error?: (error: Error) => void;
    };
}
export declare class StreamSocket {
    readonly socket: core.ReconnectingWebSocket;
    protected readonly eventHandlers: StreamSocket.EventHandlers;
    private handleOpen;
    private handleMessage;
    private handleClose;
    private handleError;
    constructor(args: StreamSocket.Args);
    /** The current state of the connection; this is one of the readyState constants. */
    get readyState(): number;
    /**
     * @param event - The event to attach to.
     * @param callback - The callback to run when the event is triggered.
     * Usage:
     * ```typescript
     * this.on('open', () => {
     *     console.log('The websocket is open');
     * });
     * ```
     */
    on<T extends keyof StreamSocket.EventHandlers>(event: T, callback: StreamSocket.EventHandlers[T]): void;
    sendPublish(message: Hume.expressionMeasurement.stream.StreamModelsEndpointPayload): void;
    /** Connect to the websocket and register event handlers. */
    connect(): StreamSocket;
    /** Close the websocket and unregister event handlers. */
    close(): void;
    /** Returns a promise that resolves when the websocket is open. */
    waitForOpen(): Promise<core.ReconnectingWebSocket>;
    /** Asserts that the websocket is open. */
    private assertSocketIsOpen;
    /** Send a binary payload to the websocket. */
    protected sendBinary(payload: ArrayBufferLike | Blob | ArrayBufferView): void;
}
