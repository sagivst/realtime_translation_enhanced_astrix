import type { BaseClientOptions, BaseRequestOptions } from "../../../../../../BaseClient";
import * as core from "../../../../../../core";
import * as ElevenLabs from "../../../../../index";
import { Chapters } from "../resources/chapters/client/Client";
import { Content } from "../resources/content/client/Client";
import { PronunciationDictionaries } from "../resources/pronunciationDictionaries/client/Client";
import { Snapshots } from "../resources/snapshots/client/Client";
export declare namespace Projects {
    interface Options extends BaseClientOptions {
    }
    interface RequestOptions extends BaseRequestOptions {
    }
}
export declare class Projects {
    protected readonly _options: Projects.Options;
    protected _pronunciationDictionaries: PronunciationDictionaries | undefined;
    protected _content: Content | undefined;
    protected _snapshots: Snapshots | undefined;
    protected _chapters: Chapters | undefined;
    constructor(_options?: Projects.Options);
    get pronunciationDictionaries(): PronunciationDictionaries;
    get content(): Content;
    get snapshots(): Snapshots;
    get chapters(): Chapters;
    /**
     * Returns a list of your Studio projects with metadata.
     *
     * @param {Projects.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.studio.projects.list()
     */
    list(requestOptions?: Projects.RequestOptions): core.HttpResponsePromise<ElevenLabs.GetProjectsResponse>;
    private __list;
    /**
     * Creates a new Studio project, it can be either initialized as blank, from a document or from a URL.
     *
     * @param {ElevenLabs.studio.BodyCreateStudioProjectV1StudioProjectsPost} request
     * @param {Projects.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     import { createReadStream } from "fs";
     *     await client.studio.projects.create({
     *         name: "name"
     *     })
     */
    create(request: ElevenLabs.studio.BodyCreateStudioProjectV1StudioProjectsPost, requestOptions?: Projects.RequestOptions): core.HttpResponsePromise<ElevenLabs.AddProjectResponseModel>;
    private __create;
    /**
     * Returns information about a specific Studio project. This endpoint returns more detailed information about a project than `GET /v1/studio`.
     *
     * @param {string} project_id - The ID of the project to be used. You can use the [List projects](/docs/api-reference/studio/get-projects) endpoint to list all the available projects.
     * @param {ElevenLabs.studio.ProjectsGetRequest} request
     * @param {Projects.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.studio.projects.get("21m00Tcm4TlvDq8ikWAM", {
     *         shareId: "share_id"
     *     })
     */
    get(project_id: string, request?: ElevenLabs.studio.ProjectsGetRequest, requestOptions?: Projects.RequestOptions): core.HttpResponsePromise<ElevenLabs.ProjectExtendedResponse>;
    private __get;
    /**
     * Updates the specified Studio project by setting the values of the parameters passed.
     *
     * @param {string} project_id - The ID of the project to be used. You can use the [List projects](/docs/api-reference/studio/get-projects) endpoint to list all the available projects.
     * @param {ElevenLabs.studio.BodyUpdateStudioProjectV1StudioProjectsProjectIdPost} request
     * @param {Projects.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.studio.projects.update("21m00Tcm4TlvDq8ikWAM", {
     *         name: "Project 1",
     *         defaultTitleVoiceId: "21m00Tcm4TlvDq8ikWAM",
     *         defaultParagraphVoiceId: "21m00Tcm4TlvDq8ikWAM"
     *     })
     */
    update(project_id: string, request: ElevenLabs.studio.BodyUpdateStudioProjectV1StudioProjectsProjectIdPost, requestOptions?: Projects.RequestOptions): core.HttpResponsePromise<ElevenLabs.EditProjectResponseModel>;
    private __update;
    /**
     * Deletes a Studio project.
     *
     * @param {string} project_id - The ID of the project to be used. You can use the [List projects](/docs/api-reference/studio/get-projects) endpoint to list all the available projects.
     * @param {Projects.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.studio.projects.delete("21m00Tcm4TlvDq8ikWAM")
     */
    delete(project_id: string, requestOptions?: Projects.RequestOptions): core.HttpResponsePromise<ElevenLabs.DeleteProjectResponseModel>;
    private __delete;
    /**
     * Starts conversion of a Studio project and all of its chapters.
     *
     * @param {string} project_id - The ID of the project to be used. You can use the [List projects](/docs/api-reference/studio/get-projects) endpoint to list all the available projects.
     * @param {Projects.RequestOptions} requestOptions - Request-specific configuration.
     *
     * @throws {@link ElevenLabs.UnprocessableEntityError}
     *
     * @example
     *     await client.studio.projects.convert("21m00Tcm4TlvDq8ikWAM")
     */
    convert(project_id: string, requestOptions?: Projects.RequestOptions): core.HttpResponsePromise<ElevenLabs.ConvertProjectResponseModel>;
    private __convert;
}
