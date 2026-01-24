/** THIS FILE IS MANUALLY MAINTAINED: see .fernignore */
import * as core from "../../../../../../core/index.js";
import * as Hume from "../../../../../index.js";
export declare namespace ChatSocket {
    interface Args {
        socket: core.ReconnectingWebSocket;
    }
    type Response = Hume.empathicVoice.SubscribeEvent & {
        receivedAt: Date;
    };
    type EventHandlers = {
        open?: () => void;
        message?: (message: Response) => void;
        close?: (event: core.CloseEvent) => void;
        error?: (error: Error) => void;
    };
}
export declare class ChatSocket {
    readonly socket: core.ReconnectingWebSocket;
    protected readonly eventHandlers: ChatSocket.EventHandlers;
    private handleOpen;
    private handleMessage;
    private handleClose;
    private handleError;
    constructor(args: ChatSocket.Args);
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
    on<T extends keyof ChatSocket.EventHandlers>(event: T, callback: ChatSocket.EventHandlers[T]): void;
    sendPublish(message: Hume.empathicVoice.PublishEvent): void;
    /**
     * Send audio input
     */
    sendAudioInput(message: Omit<Hume.empathicVoice.AudioInput, "type">): void;
    /**
     * Send session settings
     */
    sendSessionSettings(message?: Omit<Hume.empathicVoice.SessionSettings, "type">): void;
    /**
     * Send assistant input
     */
    sendAssistantInput(message: Omit<Hume.empathicVoice.AssistantInput, "type">): void;
    /**
     * Send pause assistant message
     */
    pauseAssistant(message?: Omit<Hume.empathicVoice.PauseAssistantMessage, "type">): void;
    /**
     * Send resume assistant message
     */
    resumeAssistant(message?: Omit<Hume.empathicVoice.ResumeAssistantMessage, "type">): void;
    /**
     * Send tool response message
     */
    sendToolResponseMessage(message: Omit<Hume.empathicVoice.ToolResponseMessage, "type">): void;
    /**
     * Send tool error message
     */
    sendToolErrorMessage(message: Omit<Hume.empathicVoice.ToolErrorMessage, "type">): void;
    /**
     * Send text input
     */
    sendUserInput(text: string): void;
    /** Connect to the websocket and register event handlers. */
    connect(): ChatSocket;
    /** Close the websocket and unregister event handlers. */
    close(): void;
    /** Returns a promise that resolves when the websocket is open. */
    waitForOpen(): Promise<core.ReconnectingWebSocket>;
    /**
     * @deprecated Use waitForOpen() instead
     */
    tillSocketOpen(): Promise<core.ReconnectingWebSocket>;
    /** Asserts that the websocket is open. */
    private assertSocketIsOpen;
    /** Send a binary payload to the websocket. */
    protected sendBinary(payload: ArrayBufferLike | Blob | ArrayBufferView): void;
}
