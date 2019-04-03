import * as ts2gas from '../src/index';

/**
 * Prints the transpiled code before and after transpilation.
 * @param {string} code The TypeScript code.
 * @example printBeforeAndAfter('const hi:string = `Hi ${1 + 2}`;');
 */
function printBeforeAndAfter(code: string) {
  console.log('v--TS--v');
  console.log(code);
  console.log('–––');
  console.log(ts2gas(code), '^--GS--^'); // Prevents newline
}

interface Tests {
  [keys: string]: () => void;
}

const tests: Tests = {
  testConst: () => {
    printBeforeAndAfter('const hi:string = `Hi ${1 + 2}`;');
  },
  testClass: () => {
    printBeforeAndAfter(
`class Hamburger {
  constructor() {
    // This is the constructor.
  }
  listToppings() {
    // This is a method.
  }
}`,
    );
  },
  testTemplateStrings: () => {
    printBeforeAndAfter(
`var name = 'Grant';
var age = 42;
console.log(\`Hello! My name is \${name}, and I am not \${age} years old.\`);
`);
  },
  testArraySpread: () => {
    printBeforeAndAfter(
`let cde = ['c', 'd', 'e'];
let scale = ['a', 'b', ...cde, 'f', 'g'];`);
  },
  testDestructure: () => {
    printBeforeAndAfter(
`let jane = { firstName: 'Jane', lastName: 'Doe'};
let john = { firstName: 'John', lastName: 'Doe', middleName: 'Smith' }
function sayName({firstName, lastName, middleName = 'N/A'}) {
  console.log(\`Hello \${firstName} \${middleName} \${lastName}\`)
}
sayName(jane) // -> Hello Jane N/A Doe
sayName(john) // -> Helo John Smith Doe`);
  },
  testImport: () => {
    printBeforeAndAfter(
`import ContentAlignment = GoogleAppsScript.Slides.ContentAlignment;
import GmailMessage = GoogleAppsScript.Gmail.GmailMessage;

function getCurrentMessage():GmailMessage {
  return GmailApp.createDraft("", "", "").send();
}`);
  },
  testExport: () => {
    printBeforeAndAfter(`export const pi = 3.141592;`);
  },
  testExportDefault: () => {
    printBeforeAndAfter(`export default const pi = 3.141592;`);
  },
  testModuleExports: () => {
    printBeforeAndAfter(`module.exports = 3.14;`);
  },
  testModuleExportsObject: () => {
    printBeforeAndAfter(`module.exports.foo = {};`);
  },
  testRequire: () => {
    printBeforeAndAfter(`const a = require('foo');`);
  },
  testExportFrom: () => {
    printBeforeAndAfter(
        `export * from 'file'\n` +
        `export { foo, bar } from "file"`);
  },
  tesMultilineImports: () => {
    printBeforeAndAfter(
`// next statement will be ignored
import ContentAlignment
= GoogleAppsScript.Slides.ContentAlignment;
// now resume with next statement`);
  },
  testMultilineExports: () => {
    printBeforeAndAfter(
`// next statement will be ignored
export { foo, bar }
  from "file";
// next statement will be preserved
/** Supported languages for localized data */
export enum Languages {
  /** English (USA) */
  eng_us = 'eng_us',
  /** French (France) */
  fre_fr = 'fre_fr',
}
export class Client {
  /** URL to the login endpoint */
  private readonly signinUrl: string;
}
export function foo() {}
export default Client;
export
  { ZipCodeValidator };
// now resume with next statement`);
  },
  testImportFrom: () => {
    printBeforeAndAfter(
`import Module from 'TypeScriptModule1';
const module = new Module();
import { SubModule } from "TypeScriptModule2";
const subModule = new SubModule();
import { SubModule2, SubModule3 } from "TypeScriptModule3";
const subModule2 = new SubModule2();
const subModule3 = new SubModule3();
import {
  SubModule4,
  SubModule5
} from "TypeScriptModule4";
const subModule4 = new SubModule4();
const subModule5 = new SubModule5();`);
        },
  testNamespace: () => {
    printBeforeAndAfter(
`namespace Pop {
export const goes = 'Goes';
export function The(): void {}
export class Wza {}
}`);
  },
  testThisKeyword: () => {
    printBeforeAndAfter(
`// code in this test semantically incorrect
getAllInstancesByUnits(): UnitMemberInstances {
  for (const row of data) {
    // following 'this' keyword should remain as is
    const instances = row.slice(this.columnOffset - 1);
    instances.forEach((e, i) => {
      // following 'this' keyword must be substitute with '_this'
      const u = this.toUnitInstance(e);
    });
  }
}`);
  },
  testHelloWorld: () => {
    printBeforeAndAfter(
`const writeToLog = (message: string) => console.info(message);

let words = ['hello', 'world'];
writeToLog(\`\${words.join(' ')}\`);`);
  },
  testDefaultParams: () => {
    printBeforeAndAfter(
`function JsonResponseHandler(url: string,
    query = {},
    params = {muteHttpExceptions: true},
    cacheName: string, cacheTime = 3600) {
  // ...
}`);
  },
  testExportImportWorkaraoundPart1: () => {
    printBeforeAndAfter(
`export const ICONS = {
  email: \`foo.png\`,
};`);
  },
  testExportImportWorkaraoundPart2: () => {
    printBeforeAndAfter(
`import { ICONS } from './package';

type _i_ICONS = typeof ICONS;
declare namespace exports {
  const ICONS: _i_ICONS;
}

exports.ICONS.email;
`);
  },
  testExportImportNamespaceWorkaround: () => {
    printBeforeAndAfter(
`namespace Package {
  export function foo() {}
}

Package.foo();

const nameIWantForMyImports = Package.foo;
nameIWantForMyImports();`);
  },
  testTypeScript_34x_highOrder: () => {
    printBeforeAndAfter(
`// Higher order function type inference
declare function pipe<A extends any[], B, C>(ab: (...args: A) => B, bc: (b: B) => C): (...args: A) => C;

declare function list<T>(a: T): T[];
declare function box<V>(x: V): { value: V };

const listBox = pipe(list, box);  // <T>(a: T) => { value: T[] }
const boxList = pipe(box, list);  // <V>(x: V) => { value: V }[]

const x1 = listBox(42);  // { value: number[] }
const x2 = boxList('hello');  // { value: string }[]

const flip = <A, B, C>(f: (a: A, b: B) => C) => (b: B, a: A) => f(a, b);
const zip = <T, U>(x: T, y: U): [T, U] => [x, y];
const flipped = flip(zip);  // <T, U>(b: U, a: T) => [T, U]

const t1 = flipped(10, 'hello');  // [string, number]
const t2 = flipped(true, 0);  // [number, boolean]`);
  },
  testTypeScript_34x_improvedReadonly: () => {
    printBeforeAndAfter(
`// Improved support for read-only arrays and tuples
function f1(mt: [number, number], rt: readonly [number, number]) {
  mt[0] = 1;  // Ok
  // rt[0] = 1;  // Error, read-only element
}

// function f2(ma: string[], ra: readonly string[], mt: [string, string], rt: readonly [string, string]) {
//   ma = ra;  // Error
//   ma = mt;  // Ok
//   ma = rt;  // Error
//   ra = ma;  // Ok
//   ra = mt;  // Ok
//   ra = rt;  // Ok
//   mt = ma;  // Error
//   mt = ra;  // Error
//   mt = rt;  // Error
//   rt = ma;  // Error
//   rt = ra;  // Error
//   rt = mt;  // Ok
// }

type ReadWrite<T> = { -readonly [P in keyof T] : T[P] };

type T0 = Readonly<string[]>;  // readonly string[]
type T1 = Readonly<[number, number]>;  // readonly [number, number]
type T2 = Partial<Readonly<string[]>>;  // readonly (string | undefined)[]
type T3 = Readonly<Partial<string[]>>;  // readonly (string | undefined)[]
type T4 = ReadWrite<Required<T3>>;  // string[]`);
  },
  testTypeScript_34x_constContext: () => {
    printBeforeAndAfter(
`// Const contexts for literal expressions
let x = 10 as const;  // Type 10
let y = <const> [10, 20];  // Type readonly [10, 20]
let z = { text: "hello" } as const;  // Type { readonly text: "hello" }`);
  },
  testTypeScript_34x_globalThis: () => {
    printBeforeAndAfter(
`// \`globalThis\`
// Add globalThis
// @Filename: one.ts
var a = 1;
var b = 2;
// @Filename: two.js
this.c = 3;
const total = globalThis.a + this.b + window.c + this.unknown;`);
  },
};
// Run tests
console.log('## TESTS ##');
const testNames = Object.keys(tests);
console.log('---------------------------------------------------------------------------------');
for (const testName of testNames) {
  console.log(`# ${testName}`);
  const test = tests[testName];
  test();
  console.log('---------------------------------------------------------------------------------');
}
