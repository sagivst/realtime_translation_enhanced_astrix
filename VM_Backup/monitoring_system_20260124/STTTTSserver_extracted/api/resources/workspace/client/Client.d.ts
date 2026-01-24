import type { BaseClientOptions } from "../../../../BaseClient";
import { Groups } from "../resources/groups/client/Client";
import { Invites } from "../resources/invites/client/Client";
import { Members } from "../resources/members/client/Client";
import { Resources } from "../resources/resources/client/Client";
export declare namespace Workspace {
    interface Options extends BaseClientOptions {
    }
}
export declare class Workspace {
    protected readonly _options: Workspace.Options;
    protected _groups: Groups | undefined;
    protected _invites: Invites | undefined;
    protected _members: Members | undefined;
    protected _resources: Resources | undefined;
    constructor(_options?: Workspace.Options);
    get groups(): Groups;
    get invites(): Invites;
    get members(): Members;
    get resources(): Resources;
}
