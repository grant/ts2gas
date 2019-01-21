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
const subModule3 = new SubModule3();`);
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
