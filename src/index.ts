import * as ts from 'typescript';

/**
 * Transpiles a TypeScript file into a valid Apps Script file.
 * @param {string} source The TypeScript source code as a string.
 * @param {ts.TranspileOptions} transpileOptions custom transpile options.
 * @see https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
 */
const ts2gas = (source: string, transpileOptions: ts.TranspileOptions = {}) => {

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
   * Create an 'after' Transformer callback function to ignore filered nodes
   * @param {ts.SyntaxKind} kind the kind of node to filter.
   * @param {NodeFilter} nodeFilter The node visitor used to transform.
   */
  const ignoreNodeAfterBuilder = (kind: ts.SyntaxKind, nodeFilter: NodeFilter): TransformerFactory =>
    (context: ts.TransformationContext) => {
      const previousOnSubstituteNode = context.onSubstituteNode;
      context.enableSubstitution(kind);
      context.onSubstituteNode = (hint, node) => {
        node = previousOnSubstituteNode(hint, node);
        if (nodeFilter(node)) {
          /** Do not emit this node */
          node = ts.createNotEmittedStatement(node);
        }
        return node;
      };
      return (file: ts.SourceFile) => file;
    };

  // the following attributes 'autoGenerateId' and 'original' are not exposed by ts
  interface InternalNode extends ts.Identifier {
    original?: ts.Node;
  }
  interface InternalIdentifier extends ts.Identifier, InternalNode {
    autoGenerateId?: number;
  }
  // little helper to reveal the internals
  function isTsIdentifier(node: ts.Node): node is InternalIdentifier { return ts.isIdentifier(node); }

  /**
   * Create an 'after' Transformer callback function to restore original identifier
   * @param {ts.SyntaxKind} kind the kind of node to filter.
   * @param {NodeFilter} nodeFilter The node visitor used to transform.
   */
  const restoreImportIdBuilder = (kind: ts.SyntaxKind, nodeFilter: NodeFilter): TransformerFactory =>
    (context: ts.TransformationContext) => {
      const previousOnSubstituteNode = context.onSubstituteNode;
      context.enableSubstitution(kind);
      context.onSubstituteNode = (hint, node) => {
        node = previousOnSubstituteNode(hint, node);
        if (
          nodeFilter(node)
          && isTsIdentifier(node) && node.autoGenerateId
          && node.original && ts.isImportDeclaration(node.original)
          && node.original.moduleSpecifier && ts.isStringLiteral(node.original.moduleSpecifier)
        ) {
          return ts.createIdentifier(`${node.original.moduleSpecifier.text}`);
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

  /** restore ts.Identifier original text */
  const identifierNode: NodeFilter = (node: ts.Node) => ts.isIdentifier(node);
  const restoreIdentifier = restoreImportIdBuilder(
    ts.SyntaxKind.Identifier,
    identifierNode,
  );
  // source = source.replace(/^.*import /mg, '// import ');

  // ## Exports
  // replace exports like `export * from 'file'`

  /** filter export...from declaration nodes */
  const exportFromNodeFilter: NodeFilter = (node: ts.Node) =>
    node.kind === ts.SyntaxKind.ExportDeclaration
    && !!node.getChildren().find(e => e.kind === ts.SyntaxKind.FromKeyword);

  const ignoreExportFrom = ignoreNodeBeforeBuilder(exportFromNodeFilter);
  // source = source.replace(/(^\s*export.*from\s*['"][^'"]*['"])/mg, '// $1');

  // After transpiling, apply these touch-ups:

  // ## exports.__esModule
  // Remove all lines that have exports.__esModule = true
  // @see https://github.com/Microsoft/TypeScript/issues/14351

  /** filter all added expression statement nodes */
  const exportEsModuleNodeFilter: NodeFilter = (node: ts.Node) =>
    ts.isExpressionStatement(node)
    && node.pos === -1 && node.end === -1
    && ts.isBinaryExpression(node.expression)
    && ts.isPropertyAccessExpression(node.expression.left)
    && ts.isIdentifier(node.expression.left.expression)
    && ts.idText(node.expression.left.expression) === 'exports'
    && ts.idText(node.expression.left.name) === '__esModule'
;  // hint this statement was added by transpiler

  const removeExportEsModule = ignoreNodeAfterBuilder(
    ts.SyntaxKind.ExpressionStatement,
    exportEsModuleNodeFilter,
  );
  // output = output.replace('exports.__esModule = true;', ''); // Remove this line

  // Remove default exports
  // (Transpiled `exports["default"]`)

  /**  Filter ts.Node which are statement assigning to 'exports["default"]' */
  const exportsDefaultNodeFilter: NodeFilter = (node: ts.Node) =>
    ts.isExpressionStatement(node)
    && ts.isBinaryExpression(node.expression)  // is it a binary expression
    && ts.isPropertyAccessExpression(node.expression.left)
    && ts.isIdentifier(node.expression.left.expression)  // is it ''exports
    && ts.idText(node.expression.left.expression) === 'exports'
    && ts.isIdentifier(node.expression.left.name)  // is it 'default'
    && ts.idText(node.expression.left.name) === 'default'
    && node.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken // '='
    && ts.isIdentifier(node.expression.right);

  /** A ts.TransformerFactory which removes 'exports["default"]' statements */
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
    // the following property is to document this little known feature
    // renamedDependencies: { SomeName: 'SomeOtherName' },
  };

  /** These the settings are always used */
  const statics: ts.TranspileOptions = {
    compilerOptions: {
      target: ts.ScriptTarget.ES3,
      noLib: true,
      noResolve: true,
      module: ts.ModuleKind.None,
    },
    transformers: {
      before: [ignoreExportFrom, ignoreImport],
      after: [restoreIdentifier, removeExportEsModule, removeExportsDefault],
    },
  };

  // keep only overridable properties
  if (typeof transpileOptions === 'object') {
    const { compilerOptions, renamedDependencies } = transpileOptions;
    transpileOptions = { compilerOptions, renamedDependencies };
  } else {
    transpileOptions = {};
  }

  // merge properties in order for proper override
  transpileOptions = deepAssign({},  // safe to mutate
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

  const pjson = require('../package.json');  // ugly hack

  // Include an exports object in all files.
  output = `// Compiled using ${pjson.name} ${pjson.version} (TypeScript ${ts.version})
var exports = exports || {};
var module = module || { exports: exports };
${output}`;

  return output;

  // types used with the TransformerAPI
  type TransformerFactory = ts.TransformerFactory<ts.SourceFile>;
  type NodeFilter = (node: ts.Node) => boolean;

  interface KeyedMap { [keys: string]: any; }

  /**
   * A 'good enough' recursive Object.assign like function
   * Properties from sources are add or overwriten on target.
   * If the value is a object, then recursion is applied
   * If the value is an array, then concatenation occurs
   * @param {KeyedMap} target The target object to mutate.
   * @param {KeyedMap[]} tar...sourcesget one or more objects to assign.
   */
  function deepAssign(target: KeyedMap, ...sources: KeyedMap[]): KeyedMap {

    for (const source of sources) {
      const keys = Object.keys(source);
      for (const key of keys) {
        const targetValue = target.hasOwnProperty(key)
          ? target[key]
          : undefined;
        if (source.hasOwnProperty(key)) {
          const value: unknown = source[key];
          if(isArray(value)) {
            target[key] = isArray(targetValue) ? targetValue.concat(value) : value;
          } else if (isObject(value)) {
            target[key] = deepAssign(isObject(targetValue) ? targetValue : {}, value);
          } else if (typeof value !== 'undefined') {
            target[key] = value;
          }
        }
      }
    }

    return target;

    // type guards helpers
    function isArray(v: unknown): v is any[] { return Array.isArray(v); }
    function isObject(v: unknown): v is { [keys: string]: any } { return typeof v === 'object'; }
  }

};

export = ts2gas;
