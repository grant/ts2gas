import * as ts from 'typescript';
import * as _ from 'lodash';

/**
 * Transpiles a TypeScript file into a valid Apps Script file.
 * @param {string} source The TypeScript source code as a string.
 * @see https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
 */
const ts2gas = (source: string, transpileOptions: ts.TranspileOptions = {}) => {

  // types used with the TransformerAPI
  type TransformerFactory = ts.TransformerFactory<ts.SourceFile>;
  type NodeFilter = (node: ts.Node) => boolean;

  /**
   * Create a 'before' Transformer callback function
   * @param {NodeFilter} nodeFilter The node visitor used to transform.
   */
  const ignoreNodeBeforeBuilder = (nodeFilter: NodeFilter): TransformerFactory =>
    (context: ts.TransformationContext) => {
      return (sf: ts.SourceFile): ts.SourceFile => visitNode(sf);

      function visitNode <T extends ts.Node>(node: T): T {
        if(nodeFilter(node)) {
          // transform the node to ignore into a ts.NotEmittedStatement
          return ts.createNotEmittedStatement(node) as unknown as T;
        }
        return ts.visitEachChild(node, visitNode, context);  // resume processing
      }
    };

  /**
   * Create an 'after' Transformer callback function
   * @param {NodeFilter} nodeFilter The node visitor used to transform.
   */
  const ignoreNodeAfterBuilder = (kind: ts.SyntaxKind, nodeFilter: NodeFilter): TransformerFactory =>
    (context: ts.TransformationContext) => {
      const previousOnSubstituteNode = context.onSubstituteNode;
      context.enableSubstitution(kind);
      context.onSubstituteNode = (hint, node) => {
        node = previousOnSubstituteNode(hint, node);
        if (nodeFilter(node)) {
          node = ts.createNotEmittedStatement(node);
        }
        return node;
      };
      return (file: ts.SourceFile) => file;
    };

  // Before transpiling, apply these touch-ups:

  // ## Imports
  // Some editors (like IntelliJ) automatically import identifiers.
  // Individual imports lines are commented out
  // i.e. import GmailMessage = GoogleAppsScript.Gmail.GmailMessage;

  /** filter all import declaration nodes */
  const importNodeFilter: NodeFilter = (node: ts.Node) =>
    ts.isImportEqualsDeclaration(node) || ts.isImportDeclaration(node);

  const ignoreImport = ignoreNodeBeforeBuilder(importNodeFilter);
  // source = source.replace(/^.*import /mg, '// import ');

  // ## Exports
  // replace exports like `export * from 'file'`

  /** filter export...from declaration nodes */
  const exportFromNodeFilter: NodeFilter = (node: ts.Node) =>
    node.kind === ts.SyntaxKind.ExportDeclaration
    && !!node.getChildren().find(e => e.kind === ts.SyntaxKind.FromKeyword);

  const ignoreExportFrom = ignoreNodeAfterBuilder(
    ts.SyntaxKind.ExpressionStatement,
    exportFromNodeFilter,
  );
  // source = source.replace(/(^\s*export.*from\s*['"][^'"]*['"])/mg, '// $1');

  // After transpiling, apply these touch-ups:

  // ## exports.__esModule
  // Remove all lines that have exports.__esModule = true
  // @see https://github.com/Microsoft/TypeScript/issues/14351

  /** filter all added expression statement nodes */
  const exportEsModuleNodeFilter: NodeFilter = (node: ts.Node) =>
    node.kind === ts.SyntaxKind.ExpressionStatement
    && node.pos === -1 && node.end === -1;  // hint this statement was added by transpiler

  const removeExportEsModule = ignoreNodeAfterBuilder(
    ts.SyntaxKind.ExpressionStatement,
    exportEsModuleNodeFilter,
  );
  // output = output.replace('exports.__esModule = true;', ''); // Remove this line

  // Remove default exports
  // (Transpiled `exports["default"]`)

  /** filter all added expression statement nodes */
  const exportsDefaultNodeFilter: NodeFilter = (node: ts.Node) =>
    ts.isExpressionStatement(node)
    && ts.isBinaryExpression(node.expression)
    && ts.isPropertyAccessExpression(node.expression.left)
    && node.expression.left.expression.hasOwnProperty('escapedText')
    && (node.expression.left.expression as unknown as {escapedText: string}).escapedText === 'exports'
    && ts.isIdentifier(node.expression.left.name)
    && ts.idText(node.expression.left.name) === 'default'
    && node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken
    // && right.kind === ts.SyntaxKind.TrueKeyword
    && ts.isIdentifier(node.expression.right);

  const removeExportsDefault = ignoreNodeAfterBuilder(
    ts.SyntaxKind.ExpressionStatement,
    exportsDefaultNodeFilter,
  );
  // output = output.replace(/^\s*exports\[\"default\"\].*$\n/mg, '');

  /** These settings can be overriden */
  const defaults: ts.TranspileOptions = {
    compilerOptions: {
      noImplicitUseStrict: true,
      experimentalDecorators: true,
      // pretty: true,
    },
  };

  /** These the settings are always used */
  const statics: ts.TranspileOptions = {
    compilerOptions: {
      target: ts.ScriptTarget.ES3,
      noLib: true,
      // lib: [  // Not be relevant with ts.transpileModule(). also 'noLib' is true
      //   'es5',
      //   'es2015.core',
      //   'es2015.collection',  // Map, Set, WeakMap, WeakSet
      //   'es2015.generator',  // Generator
      //   'es2015.promise',  // Promise
      //   'es2015.iterable',  // Iterator & Iterable
      //   'es2015.proxy',  // Proxy
      //   'es2015.proxy',  // Proxy
      //   'es2015.reflect',  // Reflect
      //   'es2015.symbol',  // Symbol
      //   'es2015.symbol.wellknown',  // WellKnown symbols
      // ],
      noResolve: true,
      module: ts.ModuleKind.None,
      // moduleResolution: ts.ModuleResolutionKind.NodeJs,
    },
    transformers: {
      before: [ignoreExportFrom, ignoreImport],
      after: [removeExportEsModule, removeExportsDefault],
    },
  };

  // keep only overridable properties
  transpileOptions = _.isObject(transpileOptions)
    ? _.pick(transpileOptions, ['compilerOptions', 'renamedDependencies'])
    : {};

  // merge properties in order for proper override
  transpileOptions = _.merge({},
    defaults,  // default (overridable)
    transpileOptions,  // user override
    statics,  // statics
  );

  // Transpile (cf. https://www.typescriptlang.org/docs/handbook/compiler-options.html)
  const result = ts.transpileModule(source, transpileOptions);

  // # Clean up output (multiline string)
  let output = result.outputText;

  // ## Exports
  // Exports are transpiled to variables 'exports' and 'module.exports'

  const pjson = require('../package.json');

  // Include an exports object in all files.
  output = `// Compiled using ${pjson.name} ${pjson.version} (TypeScript ${ts.version})
var exports = exports || {};
var module = module || { exports: exports };
${output}`;

  return output;
};

export = ts2gas;
