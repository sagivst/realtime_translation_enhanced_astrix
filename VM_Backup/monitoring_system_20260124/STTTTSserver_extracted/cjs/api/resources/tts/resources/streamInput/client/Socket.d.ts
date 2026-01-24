import * as core from "../../../../../../core/index.js";
import type * as Hume from "../../../../../index.js";
export declare namespace StreamInputSocket {
    interface Args {
        socket: core.ReconnectingWebSocket;
    }
    type Response = Hume.tts.TtsOutput;
    type EventHandlers = {
        open?: () => void;
        message?: (message: Response) => void;
        close?: (event: core.CloseEvent) => void;
        error?: (error: Error) => void;
    };
}
export declare class StreamInputSocket {
    readonly socket: core.ReconnectingWebSocket;
    protected readonly eventHandlers: StreamInputSocket.EventHandlers;
    private handleOpen;
    private handleMessage;
    private handleClose;
    private handleError;
    constructor(args: StreamInputSocket.Args);
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
    on<T extends keyof StreamInputSocket.EventHandlers>(event: T, callback: StreamInputSocket.EventHandlers[T]): void;
    sendPublish(message: Hume.tts.PublishTts): void;
    /** Connect to the websocket and register event handlers. */
    connect(): StreamInputSocket;
    /** Close the websocket and unregister event handlers. */
    close(): void;
    /** Returns a promise that resolves when the websocket is open. */
    waitForOpen(): Promise<core.ReconnectingWebSocket>;
    /** Asserts that the websocket is open. */
    private assertSocketIsOpen;
    /** Send a binary payload to the websocket. */
    protected sendBinary(payload: ArrayBufferLike | Blob | ArrayBufferView): void;
}
