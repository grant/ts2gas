import fs from 'fs';
import typescript from 'typescript';
import type { PackageJson } from 'type-fest';
import type {
  Node,
  SourceFile,
  SyntaxKind,
  Transformer,
  TransformerFactory,
  TranspileOptions,
  Visitor,
} from 'typescript';

const {
  addSyntheticTrailingComment,
  EmitFlags,
  factory: {
    createBinaryExpression,
    createIdentifier,
    createNotEmittedStatement,
    createObjectLiteralExpression,
    createPropertyAssignment,
    createToken,
    createVariableDeclaration,
    createVariableDeclarationList,
    createVariableStatement,
    updateSourceFile,
  },
  idText,
  isBinaryExpression,
  isEnumDeclaration,
  isExportDeclaration,
  isExpressionStatement,
  isIdentifier,
  isImportDeclaration,
  isImportEqualsDeclaration,
  isPropertyAccessExpression,
  ModuleKind,
  NodeFlags,
  ScriptTarget,
  setEmitFlags,
  SyntaxKind: tsSyntaxKind,
  transpileModule,
  version,
  visitEachChild,
  visitNode,
} = typescript;

// Type guards helpers
const isObject = (v: unknown): v is Record<string, unknown> => Object.prototype.toString.call(v) === '[object Object]';

/**
 * A 'good enough' recursive Object.assign like function
 * Properties from sources are add or overwritten on target.
 * If the value is a object, then recursion is applied
 * If the value is an array, then concatenation occurs
 * @param {Record<string, unknown>} target The target object to mutate.
 * @param {Array<Record<string, unknown>>} sources one or more objects to assign.
 */
const deepAssign = (target: TranspileOptions, ...sources: Readonly<TranspileOptions[]>): TranspileOptions => {
  for (const source of sources) {
    const keys = Reflect.ownKeys(source);
    for (const key of keys) {
      const targetValue = Reflect.get(target, key) as unknown;
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const value = Reflect.get(source, key) as unknown;
        if (Array.isArray(value)) {
          Reflect.set(
            target,
            key,
            Array.isArray(targetValue) ? [...(targetValue as unknown[]), ...(value as unknown[])] : value,
          );
        } else if (isObject(value)) {
          Reflect.set(target, key, deepAssign(isObject(targetValue) ? targetValue : {}, value));
        } else if (typeof value !== 'undefined') {
          Reflect.set(target, key, value);
        }
      }
    }
  }

  return target;
};

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8')) as PackageJson;

// Transformer types
type NodeFilter = (node: Node) => boolean;
type BeforeTransformerFactory = (filter: NodeFilter) => TransformerFactory<SourceFile>;
type AfterTransformerFactory = (kind: SyntaxKind, filter: NodeFilter) => TransformerFactory<SourceFile>;

/**
 * Transpiles a TypeScript file into a valid Apps Script file.
 * @param {string} source The TypeScript source code as a string.
 * @param {TranspileOptions} transpileOptions custom transpile options.
 * @see https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API
 */
const ts2gas = (source: string, transpileOptions: Readonly<TranspileOptions> = {}): string => {
  /** Semaphore for emitting dummy `module.exports` */
  let addDummyModule = false;

  // Node filters

  /**
   * Filter any expression statement assigning to 'exports["default"]'
   */
  const exportsDefaultNodeFilter: NodeFilter = (node: Node) =>
    isExpressionStatement(node) &&
    isBinaryExpression(node.expression) && // Is it a binary expression
    isPropertyAccessExpression(node.expression.left) &&
    isIdentifier(node.expression.left.expression) && // Is it 'exports'
    idText(node.expression.left.expression) === 'exports' &&
    isIdentifier(node.expression.left.name) && // Is it 'default'
    idText(node.expression.left.name) === 'default' &&
    node.expression.operatorToken.kind === tsSyntaxKind.EqualsToken && // '='
    isIdentifier(node.expression.right);

  /**
   * Filter any added `exports.__esModule` expression statement
   */
  const exportEsModuleNodeFilter: NodeFilter = (node: Node) =>
    isExpressionStatement(node) &&
    node.pos === -1 &&
    node.end === -1 && // Hint: it was added by the tranpiler
    isBinaryExpression(node.expression) &&
    isPropertyAccessExpression(node.expression.left) &&
    isIdentifier(node.expression.left.expression) &&
    idText(node.expression.left.expression) === 'exports' &&
    idText(node.expression.left.name) === '__esModule';

  /**
   * Filter any `export`...`from` declaration
   */
  const exportFromNodeFilter: NodeFilter = (node: Node) =>
    isExportDeclaration(node) && node.getChildren().some((node) => node.kind === tsSyntaxKind.FromKeyword);

  /**
   * Filter any import declaration
   */
  const importNodeFilter: NodeFilter = (node: Node) => isImportEqualsDeclaration(node) || isImportDeclaration(node);

  /**
   * Filter any identifier
   */
  const identifierFilter: NodeFilter = (node: Node) => isIdentifier(node);

  // Transformers

  /**
   *  Create a commented-out statement
   * @param {Node} node The node to comment-out.
   */
  const createCommentedStatement: Transformer<Node> = (node: Node) => {
    const ignoredNode = createNotEmittedStatement(node);
    addSyntheticTrailingComment(
      ignoredNode,
      tsSyntaxKind.SingleLineCommentTrivia,
      node.getText().replace(/\n/g, '\\n'),
    );
    return ignoredNode;
  };

  // `before:` transformer factories

  /**
   * Create a 'before' Transformer callback function
   * It use 'createCommentedStatement' to comment-out filtered node
   * @param {NodeFilter} nodeFilter The node visitor used to transform.
   */
  const ignoreNodeBeforeBuilder: BeforeTransformerFactory = (nodeFilter) => (context) => {
    const visitor: Visitor = (node) =>
      nodeFilter(node) ? createCommentedStatement(node) : visitEachChild(node, visitor, context);

    return (sourceFile: SourceFile) => visitNode(sourceFile, visitor);
  };

  /**
   * Create a 'before' Transformer callback function
   * It use applies the 'NoSubstitution' flag on every node
   * @param {NodeFilter} nodeFilter The node visitor used to transform (unused here).
   */
  const noSubstitutionBeforeBuilder: BeforeTransformerFactory = (nodeFilter) => (context) => {
    const visitor: Visitor = (node) => {
      if (
        nodeFilter(node) && // Node kind is Identifier
        // Do not process if parent kind is EnumDeclaration
        !(node.parent && isEnumDeclaration(node.parent))
      ) {
        setEmitFlags(node, EmitFlags.NoSubstitution);
      }

      return visitEachChild(node, visitor, context);
    };

    return (sourceFile: SourceFile) => visitNode(sourceFile, visitor);
  };

  // `after:` transformer factories

  /**
   * Create an 'after' Transformer callback function to ignore filtered nodes
   * @param {SyntaxKind} kind the kind of node to filter.
   * @param {NodeFilter} nodeFilter The node visitor used to transform.
   */
  const ignoreNodeAfterBuilder: AfterTransformerFactory = (kind, nodeFilter) => (context) => {
    const previousOnSubstituteNode = context.onSubstituteNode;

    context.enableSubstitution(kind);
    context.onSubstituteNode = (hint, node) => {
      node = previousOnSubstituteNode(hint, node);
      if (nodeFilter(node)) {
        /** Do not emit this node */
        // node = createEmptyStatement();
        // node = createCommentedStatement(node);
        node = createNotEmittedStatement(node);
      }

      return node;
    };

    return (sourceFile) => sourceFile;
  };

  // Before transpiling, apply these touch-ups:

  const noSubstitution = noSubstitutionBeforeBuilder(identifierFilter);

  // ## Imports
  // Some editors (like IntelliJ) automatically import identifiers.
  // Individual imports lines are commented out
  // i.e. import GmailMessage = GoogleAppsScript.Gmail.GmailMessage;
  const ignoreImport = ignoreNodeBeforeBuilder(importNodeFilter);

  // ## Exports
  // ignore exports like `export * from 'file'`
  const ignoreExportFrom = ignoreNodeBeforeBuilder(exportFromNodeFilter);

  // After transpiling, apply these touch-ups:

  // ## exports.__esModule
  // Remove all lines that have exports.__esModule = true
  // @see https://github.com/Microsoft/TypeScript/issues/14351
  const removeExportEsModule = ignoreNodeAfterBuilder(tsSyntaxKind.ExpressionStatement, exportEsModuleNodeFilter);

  // Remove default exports
  // (Transpiled `exports["default"]`)
  const removeExportsDefault = ignoreNodeAfterBuilder(tsSyntaxKind.ExpressionStatement, exportsDefaultNodeFilter);

  const detectExportNodes: TransformerFactory<SourceFile> = (context) => (sourceFile) => {
    const visitor: Visitor = (node) => {
      if (addDummyModule) {
        // No need to look further
        return node;
      }

      if (isIdentifier(node) && idText(node) === 'exports') {
        addDummyModule = true;
      }

      return visitEachChild(node, visitor, context);
    };

    return visitNode(sourceFile, visitor);
  };

  const addDummyModuleNodes: TransformerFactory<SourceFile> = () => (sourceFile: SourceFile) =>
    addDummyModule
      ? updateSourceFile(sourceFile, [
          createVariableStatement(
            undefined,
            createVariableDeclarationList(
              [
                createVariableDeclaration(
                  createIdentifier('exports'),
                  undefined,
                  undefined,
                  createBinaryExpression(
                    createIdentifier('exports'),
                    createToken(tsSyntaxKind.BarBarToken),
                    createObjectLiteralExpression([], false),
                  ),
                ),
              ],
              NodeFlags.None,
            ),
          ),
          createVariableStatement(
            undefined,
            createVariableDeclarationList(
              [
                createVariableDeclaration(
                  createIdentifier('module'),
                  undefined,
                  undefined,
                  createBinaryExpression(
                    createIdentifier('module'),
                    createToken(tsSyntaxKind.BarBarToken),
                    createObjectLiteralExpression(
                      [createPropertyAssignment(createIdentifier('exports'), createIdentifier('exports'))],
                      false,
                    ),
                  ),
                ),
              ],
              NodeFlags.None,
            ),
          ),
          ...sourceFile.statements,
        ])
      : sourceFile;

  /**
   * These settings can be overridden
   */
  const defaults: TranspileOptions = {
    compilerOptions: {
      experimentalDecorators: true,
      noImplicitUseStrict: true,
      target: ScriptTarget.ES3,
      /* Other defaults */
      // removeComments: true,
      // pretty: true,
    },
    // The following property is to document this little known feature
    // renamedDependencies: { SomeName: 'SomeOtherName' },
  };

  /**
   * These the settings are always used and cannot be overridden
   *
   * Extra compiler options that will unconditionally be used by this function are
   * - isolatedModules = true
   * - noLib = true
   * - noResolve = true
   */
  const statics: TranspileOptions = {
    compilerOptions: {
      emitDeclarationOnly: false, // TranspileModule() will crash if set to true
      module: ModuleKind.None,
    },
    transformers: {
      before: [noSubstitution, ignoreExportFrom, ignoreImport],
      after: [removeExportEsModule, removeExportsDefault, detectExportNodes, addDummyModuleNodes],
    },
  };

  // Keep only override-able properties
  if (typeof transpileOptions === 'object') {
    const { compilerOptions, renamedDependencies } = transpileOptions;
    transpileOptions = { compilerOptions, renamedDependencies };
  } else {
    transpileOptions = {};
  }

  // Merge properties in order for proper override
  transpileOptions = deepAssign(
    {},
    defaults, // Default (override-able)
    transpileOptions, // User override
    statics, // Always apply
  );

  // Transpile (cf. https://www.typescriptlang.org/docs/handbook/compiler-options.html)
  const result = transpileModule(source, transpileOptions);

  // # Clean up output (multiline string)
  let output = result.outputText;

  // ## Exports
  // Exports are transpiled to variables 'exports' and 'module.exports'

  // Include an exports object in all files.
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  output = `// Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
${output}`;

  return output;
};

export default ts2gas;
