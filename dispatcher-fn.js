// @ts-check

import { runSchema } from "./schema-function";
import { stitched } from "./stitched";

/**
 * @type {import('graphql').GraphQLSchema}
 */
let schema;

/**
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export default function (req) {
  if (!schema) {
    schema = stitched(new URL(req.url));
  }
  return runSchema(schema, req);
}
