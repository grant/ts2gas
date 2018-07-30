const ts2gas = require('./');

/**
 * Prints the transpiled code before and after transpilation.
 * @param {string} code The TypeScript code.
 * @example printBeforeAndAfter('const hi:string = `Hi ${1 + 2}`;');
 */
function printBeforeAndAfter(code) {
  console.log('v--TS--v');
  console.log(code);
  console.log('--');
  console.log(ts2gas(code), '^--GS--^'); // Prevents newline
  console.log();
}

console.log('## TESTS ##')
// Test a simple conversion.
printBeforeAndAfter('const hi:string = `Hi ${1 + 2}`;');
printBeforeAndAfter(`class Hamburger {
  constructor() {
    // This is the constructor.
  }
  listToppings() {
    // This is a method.
  }
}`);
printBeforeAndAfter(`
import GmailMessage = GoogleAppsScript.Gmail.GmailMessage;

function getCurrentMessage():GmailMessage {
  return GmailApp.createDraft("", "", "").send()
}

getCurrentMessage();
`);
// TODO: Add more examples