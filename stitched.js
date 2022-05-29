// @ts-check

import { schemas } from "./schemas";
import { stitchSchemas } from "@graphql-tools/stitch";

/**
 * @param {URL} baseUrl
 */
export function stitched(baseUrl) {
  return stitchSchemas({
    subschemas: schemas(baseUrl),
  });
}
