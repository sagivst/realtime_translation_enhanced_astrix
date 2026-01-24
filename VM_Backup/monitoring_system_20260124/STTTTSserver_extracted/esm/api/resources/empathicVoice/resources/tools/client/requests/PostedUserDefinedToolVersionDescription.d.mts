/**
 * @example
 *     {
 *         versionDescription: "Fetches current temperature, precipitation, wind speed, AQI, and other weather conditions. Uses Celsius, Fahrenheit, or kelvin depending on user's region."
 *     }
 */
export interface PostedUserDefinedToolVersionDescription {
    /** An optional description of the Tool version. */
    versionDescription?: string;
}
