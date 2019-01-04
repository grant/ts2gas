import * as ts from 'typescript';

/**
 * Transpiles a TypeScript file into a valid Apps Script file.
 * Note: Do not convert this method to TypeScript or else the compiler will get confused.
 * @param {string} source The TypeScript source code as a string.
 * @see https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
 */
const ts2gas = (source: string) => {
  // Before transpiling, apply these touch-ups:

  // ## Imports
  // Some editors (like IntelliJ) automatically import identifiers.
  // Individual imports lines are commented out
  // i.e. import GmailMessage = GoogleAppsScript.Gmail.GmailMessage;
  source = source.replace(/^.*import /mg, '// import ');

  // ## Exports
  // replace exports like `export * from 'file'`
  source = source.replace(/(^\s*export.*from\s*['"][^'"]*['"])/mg, '// $1');

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
var module = module || { exports: exports };\n` + output;

  // Remove default exports
  // (Transpiled `exports["default"]`)
  output = output.replace(/^.*exports\[\"default\"\].*$\n/mg, '');

  return output;
};

export = ts2gas;
