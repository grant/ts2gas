var ts = require("typescript");

/**
 * Transpiles a TypeScript file into a valid Apps Script file.
 * Note: Do not convert this method to TypeScript or else the compiler will get confused.
 * @param {string} source The TypeScript source code as a string.
 * @see https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
 */
module.exports = (source) => {
  // https://www.typescriptlang.org/docs/handbook/compiler-options.html
  var result = ts.transpileModule(source, {
    compilerOptions: {
      lib: 'ES2015',
      target: 'ES3',
      noImplicitUseStrict: true,
      noLib: true,
      experimentalDecorators: true,
      noResolve: true,
      pretty: true,
      module: ts.ModuleKind.CommonJS,
    }
  });
  return result.outputText;
}