import * as ts from 'typescript';

/**
 * Transpiles a TypeScript file into a valid Apps Script file.
 * @param {string} source The TypeScript source code as a string.
 * @see https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
 */
const ts2gas = (source: string) => {
  // Before transpiling, apply these touch-ups:

  // ## Imports
  // Some editors (like IntelliJ) automatically import identifiers.
  // Individual imports lines are commented out
  // i.e. import GmailMessage = GoogleAppsScript.Gmail.GmailMessage;
  function ignoreImport(context: ts.TransformationContext) {
    return (sourceFile: ts.SourceFile): ts.SourceFile => {
      return visitNode(sourceFile);
    };
    function visitNode <T extends ts.Node>(node: T): T {
      if(node.kind === ts.SyntaxKind.ImportEqualsDeclaration
        || node.kind === ts.SyntaxKind.ImportDeclaration) {
        return ts.createNotEmittedStatement(node) as unknown as T;
      }
      return ts.visitEachChild(node, visitNode, context);
    }
  }
  // source = source.replace(/^.*import /mg, '// import ');

  // ## Exports
  // replace exports like `export * from 'file'`
  function ignoreExportFrom(context: ts.TransformationContext) {
    return (sourceFile: ts.SourceFile): ts.SourceFile => {
      return visitNode(sourceFile);
    };
    function visitNode <T extends ts.Node>(node: T): T {
      if(node.kind === ts.SyntaxKind.ExportDeclaration
        && node.getChildren().find(e => e.kind === ts.SyntaxKind.FromKeyword)) {
        return ts.createNotEmittedStatement(node) as unknown as T;
      }
      return ts.visitEachChild(node, visitNode, context);
    }
  }
  // source = source.replace(/(^\s*export.*from\s*['"][^'"]*['"])/mg, '// $1');

  // Transpile
  // https://www.typescriptlang.org/docs/handbook/compiler-options.html
  const result = ts.transpileModule(source, {
    compilerOptions: {
      lib: ['ES2015'],
      target: ts.ScriptTarget.ES3,
      noImplicitUseStrict: true,
      noLib: true,
      experimentalDecorators: true,
      noResolve: true,
      pretty: true,
      module: ts.ModuleKind.None,
      // moduleResolution: ts.ModuleResolutionKind.NodeJs,
    },
    transformers: {
      before: [ignoreExportFrom, ignoreImport],
      // after: [ignoreXXX],
      // afterDeclarations: [],
    },
  });

  // After transpiling, apply these touch-ups:

  // # Clean up output (multiline string)
  let output = result.outputText;

  // ## exports.__esModule
  // Remove all lines that have exports.__esModule = true
  // @see https://github.com/Microsoft/TypeScript/issues/14351
  output = output.replace('exports.__esModule = true;', ''); // Remove this line

  // ## Exports
  // Exports are transpiled to variables 'exports' and 'module.exports'

  // Include an exports object in all files.
  output = `var exports = exports || {};
var module = module || { exports: exports };
${output}`;

  // Remove default exports
  // (Transpiled `exports["default"]`)
  output = output.replace(/^\s*exports\[\"default\"\].*$\n/mg, '');

  return output;
};

export = ts2gas;
