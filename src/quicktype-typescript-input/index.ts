import * as ts from "typescript";
import { PartialArgs, generateSchema } from "@mark.probst/typescript-json-schema";

import { defined, JSONSchemaSourceData, messageError } from "../quicktype-core";

const settings: PartialArgs = {
    required: true,
    titles: true,
    topRef: true,
};

const compilerOptions: ts.CompilerOptions = {
    noEmit: true,
    emitDecoratorMetadata: true,
    experimentalDecorators: true,
    target: ts.ScriptTarget.ES5,
    module: ts.ModuleKind.ESNext,
    strictNullChecks: true,
    typeRoots: [],
    rootDir: ".",
    jsx: 1,
    lib: ["lib.dom.d.ts", "lib.dom.iterable.d.ts", "lib.esnext.d.ts"],
    allowJs: true,
    skipLibCheck: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: true,
    forceConsistentCasingInFileNames: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    resolveJsonModule: true,
    isolatedModules: true,
    downlevelIteration: true,
    //       "rootDirs": ["src"],
    //       "baseUrl": "./src",
};

// {
//     "compilerOptions": {
//       "target": "es5",
//       "lib": ["dom", "dom.iterable", "ESNext"],
//       "allowJs": true,
//       "skipLibCheck": true,
//       "esModuleInterop": true,
//       "allowSyntheticDefaultImports": true,
//       "strict": true,
//       "forceConsistentCasingInFileNames": true,
//       "module": "ESNext",
//       "moduleResolution": "node",
//       "resolveJsonModule": true,
//       "isolatedModules": true,
//       "noEmit": true,
//       "jsx": "preserve",
//       "rootDirs": ["src"],
//       "baseUrl": "./src",
//       "downlevelIteration": true
//     },
//     "include": ["src"]
//   }

// FIXME: We're stringifying and then parsing this schema again.  Just pass around
// the schema directly.
export function schemaForTypeScriptSources(sourceFileNames: string[]): JSONSchemaSourceData {
    const program = ts.createProgram(sourceFileNames, compilerOptions);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    const error = diagnostics.find((d) => d.category === ts.DiagnosticCategory.Error);
    if (error !== undefined) {
        return messageError("TypeScriptCompilerError", {
            message: ts.flattenDiagnosticMessageText(error.messageText, "\n"),
        });
    }
    console.log("generate schema");
    const schema = generateSchema(program, "*", settings);
    const uris: string[] = [];
    let topLevelName: string | undefined = undefined;
    console.log("schema condition");
    if (schema !== null && typeof schema === "object" && typeof schema.definitions === "object") {
        for (const name of Object.getOwnPropertyNames(schema.definitions)) {
            const definition = schema.definitions[name];
            if (
                definition === null ||
                Array.isArray(definition) ||
                typeof definition !== "object" ||
                typeof definition.description !== "string"
            ) {
                continue;
            }

            const description = definition.description as string;
            const matches = description.match(/#TopLevel/);
            if (matches === null) {
                continue;
            }

            const index = defined(matches.index);
            definition.description = description.substr(0, index) + description.substr(index + matches[0].length);

            uris.push(`#/definitions/${name}`);

            if (topLevelName === undefined) {
                if (typeof definition.title === "string") {
                    topLevelName = definition.title;
                } else {
                    topLevelName = name;
                }
            } else {
                topLevelName = "";
            }
        }
    }
    console.log("uri condition");
    if (uris.length === 0) {
        uris.push("#/definitions/");
    }
    console.log("top level name condition");
    if (topLevelName === undefined) {
        topLevelName = "";
    }
    console.log("return line");
    return { schema: JSON.stringify(schema), name: topLevelName, uris, isConverted: true };
}
