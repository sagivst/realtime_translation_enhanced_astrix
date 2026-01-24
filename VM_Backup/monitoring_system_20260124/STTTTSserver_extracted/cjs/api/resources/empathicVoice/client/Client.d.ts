import type { BaseClientOptions } from "../../../../BaseClient.js";
import { Chat } from "../resources/chat/client/Client.js";
import { ChatGroups } from "../resources/chatGroups/client/Client.js";
import { Chats } from "../resources/chats/client/Client.js";
import { Configs } from "../resources/configs/client/Client.js";
import { ControlPlane } from "../resources/controlPlane/client/Client.js";
import { Prompts } from "../resources/prompts/client/Client.js";
import { Tools } from "../resources/tools/client/Client.js";
export declare namespace EmpathicVoice {
    interface Options extends BaseClientOptions {
    }
}
export declare class EmpathicVoice {
    protected readonly _options: EmpathicVoice.Options;
    protected _controlPlane: ControlPlane | undefined;
    protected _chatGroups: ChatGroups | undefined;
    protected _chats: Chats | undefined;
    protected _configs: Configs | undefined;
    protected _prompts: Prompts | undefined;
    protected _tools: Tools | undefined;
    protected _chat: Chat | undefined;
    constructor(_options?: EmpathicVoice.Options);
    get controlPlane(): ControlPlane;
    get chatGroups(): ChatGroups;
    get chats(): Chats;
    get configs(): Configs;
    get prompts(): Prompts;
    get tools(): Tools;
    get chat(): Chat;
}
