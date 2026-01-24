import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../../../BaseClient";
import * as core from "../../../../../../../../core";
import * as ElevenLabs from "../../../../../../../index";
export declare namespace Snapshots {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Snapshots {
    protected readonly _options: Snapshots.Options;
    constructor(_options?: Snapshots.Options);
    /**
     * Retrieves a list of snapshots for a Studio project.
     *
     * @param {string} project_id - The ID of the Studio project.
     * @param {Snapshots.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.studio.projects.snapshots.list("21m00Tcm4TlvDq8ikWAM")
     */
    list(project_id: string, requestOptions?: Snapshots.RequestOptions): core.HttpResponsePromise<ElevenLabs.ProjectSnapshotsResponse>;
    private __list;
    /**
     * Returns the project snapshot.
     *
     * @param {string} project_id - The ID of the Studio project.
     * @param {string} project_snapshot_id - The ID of the Studio project snapshot.
     * @param {Snapshots.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.studio.projects.snapshots.get("21m00Tcm4TlvDq8ikWAM", "21m00Tcm4TlvDq8ikWAM")
     */
    get(project_id: string, project_snapshot_id: string, requestOptions?: Snapshots.RequestOptions): core.HttpResponsePromise<ElevenLabs.ProjectSnapshotExtendedResponseModel>;
    private __get;
    /**
     * Stream the audio from a Studio project snapshot.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    stream(project_id: string, project_snapshot_id: string, request?: ElevenLabs.studio.projects.BodyStreamStudioProjectAudioV1StudioProjectsProjectIdSnapshotsProjectSnapshotIdStreamPost, requestOptions?: Snapshots.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __stream;
    /**
     * Returns a compressed archive of the Studio project's audio.
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     */
    streamArchive(project_id: string, project_snapshot_id: string, requestOptions?: Snapshots.RequestOptions): core.HttpResponsePromise<ReadableStream<Uint8Array>>;
    private __streamArchive;
}
