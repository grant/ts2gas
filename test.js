const ts2gas = require('./');

/**
 * Prints the transpiled code before and after transpilation.
 * @param {string} code The TypeScript code.
 * @example printBeforeAndAfter('const hi:string = `Hi ${1 + 2}`;');
 */
function printBeforeAndAfter(code) {
  console.log('v--TS--v');
  console.log(code);
  console.log('–––');
  console.log(ts2gas(code), '^--GS--^'); // Prevents newline
}

const tests = {
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
}`
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
  }
};

// Run tests
console.log('## TESTS ##')
const testNames = Object.keys(tests);
console.log('---------------------------------------------------------------------------------');
for (let testName of testNames) {
  console.log('# ' + testName);
  tests[testName]();
  console.log('---------------------------------------------------------------------------------');
}
