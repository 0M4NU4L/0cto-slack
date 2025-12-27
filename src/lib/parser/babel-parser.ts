import { parse } from "@babel/parser";

export interface ImportStatement {
  source: string;
  specifiers: string[];
  type: "import" | "require";
}

export interface ExportStatement {
  name: string;
  type: "default" | "named";
}

export interface ParseResult {
  success: true;
  imports: ImportStatement[];
  exports: ExportStatement[];
  functions: string[];
  classes: string[];
}

export interface ParseError {
  success: false;
  error: string;
}

export type FileParseResult = ParseResult | ParseError;

const JS_TS_EXTENSIONS = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];

export function canParse(filePath: string): boolean {
  return JS_TS_EXTENSIONS.some((ext) => filePath.endsWith(ext));
}

export function parseFile(content: string, filePath: string): FileParseResult {
  try {
    // Determine if TypeScript
    const isTypeScript = filePath.endsWith(".ts") || filePath.endsWith(".tsx");
    const isJSX = filePath.endsWith(".jsx") || filePath.endsWith(".tsx");

    const ast = parse(content, {
      sourceType: "module",
      plugins: [
        isTypeScript && "typescript",
        isJSX && "jsx",
        "decorators-legacy",
        "classProperties",
        "objectRestSpread",
        "optionalChaining",
        "nullishCoalescingOperator",
      ].filter(Boolean) as any[],
    });

    const imports: ImportStatement[] = [];
    const exports: ExportStatement[] = [];
    const functions: string[] = [];
    const classes: string[] = [];

    // Traverse AST
    for (const node of ast.program.body) {
      // Import declarations
      if (node.type === "ImportDeclaration") {
        const specifiers = node.specifiers
          .map((spec) => {
            if (spec.type === "ImportDefaultSpecifier") {
              return spec.local.name;
            } else if (spec.type === "ImportNamespaceSpecifier") {
              return `* as ${spec.local.name}`;
            } else if (spec.type === "ImportSpecifier") {
              return spec.imported.type === "Identifier"
                ? spec.imported.name
                : "";
            }
            return "";
          })
          .filter(Boolean);

        imports.push({
          source: node.source.value,
          specifiers,
          type: "import",
        });
      }

      // Export declarations
      if (node.type === "ExportDefaultDeclaration") {
        exports.push({
          name: "default",
          type: "default",
        });
      }

      if (node.type === "ExportNamedDeclaration") {
        node.specifiers.forEach((spec) => {
          if (spec.type === "ExportSpecifier") {
            const name =
              spec.exported.type === "Identifier" ? spec.exported.name : "";
            if (name) {
              exports.push({
                name,
                type: "named",
              });
            }
          }
        });

        // Export function/class declarations
        if (node.declaration) {
          if (
            node.declaration.type === "FunctionDeclaration" &&
            node.declaration.id
          ) {
            exports.push({
              name: node.declaration.id.name,
              type: "named",
            });
            functions.push(node.declaration.id.name);
          } else if (
            node.declaration.type === "ClassDeclaration" &&
            node.declaration.id
          ) {
            exports.push({
              name: node.declaration.id.name,
              type: "named",
            });
            classes.push(node.declaration.id.name);
          }
        }
      }

      // Function declarations
      if (node.type === "FunctionDeclaration" && node.id) {
        functions.push(node.id.name);
      }

      // Class declarations
      if (node.type === "ClassDeclaration" && node.id) {
        classes.push(node.id.name);
      }

      // Variable declarations with require
      if (node.type === "VariableDeclaration") {
        for (const declaration of node.declarations) {
          if (
            declaration.init &&
            declaration.init.type === "CallExpression" &&
            declaration.init.callee.type === "Identifier" &&
            declaration.init.callee.name === "require" &&
            declaration.init.arguments[0] &&
            declaration.init.arguments[0].type === "StringLiteral"
          ) {
            const source = declaration.init.arguments[0].value;
            const specifier =
              declaration.id.type === "Identifier"
                ? declaration.id.name
                : "unknown";

            imports.push({
              source,
              specifiers: [specifier],
              type: "require",
            });
          }
        }
      }
    }

    return {
      success: true,
      imports,
      exports,
      functions,
      classes,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Unknown parsing error",
    };
  }
}

export function getFileLanguage(filePath: string): string {
  if (filePath.endsWith(".ts")) return "TypeScript";
  if (filePath.endsWith(".tsx")) return "TypeScript React";
  if (filePath.endsWith(".jsx")) return "JavaScript React";
  if (filePath.endsWith(".js")) return "JavaScript";
  if (filePath.endsWith(".mjs")) return "JavaScript Module";
  if (filePath.endsWith(".cjs")) return "JavaScript CommonJS";
  return "Unknown";
}
