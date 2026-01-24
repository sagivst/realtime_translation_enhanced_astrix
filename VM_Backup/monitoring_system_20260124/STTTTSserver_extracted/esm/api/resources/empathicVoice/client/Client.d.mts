import type { BaseClientOptions } from "../../../../BaseClient.mjs";
import { Chat } from "../resources/chat/client/Client.mjs";
import { ChatGroups } from "../resources/chatGroups/client/Client.mjs";
import { Chats } from "../resources/chats/client/Client.mjs";
import { Configs } from "../resources/configs/client/Client.mjs";
import { ControlPlane } from "../resources/controlPlane/client/Client.mjs";
import { Prompts } from "../resources/prompts/client/Client.mjs";
import { Tools } from "../resources/tools/client/Client.mjs";
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
