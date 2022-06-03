// @ts-check

const fs = require("fs-extra");
const path = require("path");
const esbuild = require("esbuild");
const globby = require("globby");
const { graphql, getIntrospectionQuery } = require("graphql");

async function main() {
  await fs.remove(".vercel/output");
  await fs.remove("dist");
  await fs.outputJson(".vercel/output/config.json", {
    version: 3,
    // Add CORS just for demo purposes
    routes: [
      {
        src: "/(.+)?",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "*",
        },
      },
    ],
  });

  const files = await globby(["gql/*.js"]);
  /** @type {Record<string, string>} */
  const entryPoints = {};
  for (const file of files) {
    entryPoints[sha1(file)] = file;
  }

  // build all schemas
  await esbuild.build({
    entryPoints,
    plugins: [
      // esbuildPluginImportGlob(),
    ],
    platform: "browser",
    format: "cjs",
    outdir: "dist/schemas",
    bundle: true,
    pure: ["makeExecutableSchema"],
    treeShaking: true,
    external: ["graphql"],
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV ?? "development"
      ),
    },
  });

  // read all schema definitions
  const schemas = {};
  for (const entrypoint of Object.keys(entryPoints)) {
    const schema = require(`./dist/schemas/${entrypoint}`).schema();
    const result = await graphql({ schema, source: getIntrospectionQuery() });
    schemas[entrypoint] = result.data;
    await fs.outputJson(`./dist/introspection/${entrypoint}.json`, result.data);
  }

  await esbuild.build({
    entryPoints: {
      index: "./dispatcher-fn.js",
    },
    plugins: [globLoaderPlugin()],
    platform: "browser",
    format: "cjs",
    outdir: "dist/function",
    bundle: true,
    pure: ["makeExecutableSchema"],
    treeShaking: true,
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        process.env.NODE_ENV ?? "development"
      ),
    },
  });

  for (const entrypoint of Object.keys(entryPoints)) {
    await esbuild.build({
      stdin: {
        resolveDir: process.cwd(),
        sourcefile: `${entrypoint}.js`,
        loader: "js",
        contents: `
          import { schema } from './dist/schemas/${entrypoint}';
          import { runSchema } from './schema-function';
          export default req => runSchema(schema(), req);
        `,
      },
      plugins: [globLoaderPlugin()],
      platform: "browser",
      format: "cjs",
      outfile: `dist/function/${entrypoint}.js`,
      bundle: true,
      pure: ["makeExecutableSchema"],
      treeShaking: true,
      define: {
        "process.env.NODE_ENV": JSON.stringify(
          process.env.NODE_ENV ?? "development"
        ),
      },
    });
  }

  for (const entrypoint of [...Object.keys(entryPoints), "index"]) {
    await fs.outputJson(
      `.vercel/output/functions/${entrypoint}.func/.vc-config.json`,
      {
        runtime: "edge",
        entrypoint: "index.js",
      }
    );
    await fs.copy(
      `dist/function/${entrypoint}.js`,
      `.vercel/output/functions/${entrypoint}.func/index.js`
    );
  }
}

function sha1(str) {
  var crypto = require("crypto");
  return crypto.createHash("sha1").update(str).digest("hex");
}

/**
 * @returns {import('esbuild').Plugin}
 */
function globLoaderPlugin() {
  return {
    name: "globby",
    setup(b) {
      b.onResolve({ filter: /^globby:.+/ }, async (args) => {
        const [pathname, qp] = args.path.slice("globby:".length).split("?");
        const resolveDir = path.dirname(args.importer);

        return {
          namespace: "globby",
          path: `${resolveDir}?${pathname}?${qp}`,
        };
      });

      b.onLoad({ filter: /.+/, namespace: "globby" }, async (args) => {
        const [resolveDir, path, qp] = args.path.split("?");
        const params = new URLSearchParams(qp);
        const files = await globby(path, { absolute: true, cwd: resolveDir });
        const exportedArg = params.get("export") ?? "default";
        const nohash = params.has("nohash");

        const contents = `
          const exports = {};
          ${files
            .map((file) => {
              const filenamehash = !nohash
                ? sha1(file.replace(resolveDir, "").replace(/^\//, ""))
                : file.split("/").pop().split(".").slice(0, -1).join(".");
              return `
                export { ${exportedArg} as file_${filenamehash} } from '${file}';
              `;
            })
            .join("\n")}
          export default exports;
        `;

        return {
          contents,
          resolveDir,
        };
      });
    },
  };
}

main();
