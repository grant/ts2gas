import ts from 'typescript';
/**
 * Transpiles a TypeScript file into a valid Apps Script file.
 * @param {string} source The TypeScript source code as a string.
 * @param {ts.TranspileOptions} transpileOptions custom transpile options.
 * @see https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
 */
declare const ts2gas: (source: string, transpileOptions?: ts.TranspileOptions) => string;
export = ts2gas;
