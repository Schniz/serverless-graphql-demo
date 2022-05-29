// @ts-check

import { wrapSchema } from "@graphql-tools/wrap";
import { buildClientSchema, print } from "graphql";
// @ts-ignore
import * as mergeConfig from "globby:./gql/*.js?export=merge";
// @ts-ignore
import * as schemaDefinitions from "globby:./gql/*.js?export=schema";
// @ts-ignore
import * as schemaIntrospections from "globby:./dist/introspection/*.json?nohash";

/**
 * @param {URL} rootUrl
 */
function getRemoteSchemas(rootUrl) {
  return Object.entries(schemaIntrospections).flatMap(([key, typeDefs]) => {
    if (key === "default") return [];
    const fnName = key.split("_")[1];
    const url = new URL(`/${fnName}`, rootUrl).toString();
    return [
      {
        schema: wrapSchema({
          schema: buildClientSchema(typeDefs),
          executor: async ({
            document,
            variables,
            operationName,
            context: _context,
          }) => {
            const response = await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: print(document),
                variables,
                operationName,
              }),
            });
            return response.json();
          },
        }),
        merge: mergeConfig[key],
      },
    ];
  });
}

function getLocalSchemas() {
  return Object.entries(schemaDefinitions).flatMap(([key, schemaFn]) => {
    if (key === "default") return [];
    return [
      {
        schema: schemaFn(),
        merge: mergeConfig[key],
      },
    ];
  });
}

export const schemas =
  process.env.NODE_ENV === "production" ? getRemoteSchemas : getLocalSchemas;
