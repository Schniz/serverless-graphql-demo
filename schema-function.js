// @ts-check

import { graphql } from "graphql";

/**
 * @param {import('graphql').GraphQLSchema} schema
 * @param {Request} req
 * @returns {Promise<Response>}
 */
export async function runSchema(schema, req) {
  if (req.method !== "POST") {
    return new Response(`Must use POST`);
  }

  try {
    const { query, variables } = await req.json();
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
    });
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ERROR", e);
    return new Response(
      JSON.stringify({
        message: e.message,
        stack: e.stack,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
