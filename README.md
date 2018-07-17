# ts2gas

A function that transpiles TypeScript to Google Apps Script.

```ts
ts2gas(code: string): string
```

## Install

```
yarn add ts2gas
```

## Usage

Write Apps Script as TypeScript without including any imports.

```js
const ts2gas = require('ts2gas');

let ts = ts2gas(`
function buildName(first:string, last:string) {
  return \`\${firstName} \${lastName}\`;
}
`);

// Transpiles to:
// function buildName(first, last) {
//   return firstName + " " + lastName;
// }
```

## TypeScript Tests

Some samples of TypeScript derived from https://angular-2-training-book.rangle.io/handout/features/

```ts
class Hamburger {
  constructor() {
    // This is the constructor.
  }
  listToppings() {
    // This is a method.
  }
}

// Template strings
var name = 'Grant';
var age = 42;
console.log(`Hello! My name is ${name}, and I am not ${age} years old.`);

// Rest args
const add = (a, b) => a + b;
let args = [3, 5];
add(...args); // same as \`add(args[0], args[1])\`, or \`add.apply(null, args)\`

// Spread array
let cde = ['c', 'd', 'e'];
let scale = ['a', 'b', ...cde, 'f', 'g'];  // ['a', 'b', 'c', 'd', 'e', 'f', 'g']

// Spread map
let mapABC  = { a: 5, b: 6, c: 3};
let mapABCD = { ...mapABC, d: 7};  // { a: 5, b: 6, c: 3, d: 7 }

// Destructure
let jane = { firstName: 'Jane', lastName: 'Doe'};
let john = { firstName: 'John', lastName: 'Doe', middleName: 'Smith' }
function sayName({firstName, lastName, middleName = 'N/A'}) {
  console.log(`Hello ${firstName} ${middleName} ${lastName}`)
}
sayName(jane) // -> Hello Jane N/A Doe
sayName(john) // -> Helo John Smith Doe

// Export
export const pi = 3.141592;
function add(x: number, y: number): number {
    return x + y;
}
console.log(add(2, 2)); // 4

// Decorators
function Override(label: string) {
  return function (target: any, key: string) {
    Object.defineProperty(target, key, {
      configurable: false,
      get: () => label
    });
  }
}
class Test {
  @Override('test')      // invokes Override, which returns the decorator
  name: string = 'pat';
}
let t = new Test();
console.log(t.name);  // 'test'
```

## Developer Note

This module is written in JavaScript and not TypeScript because:
- tsc gets confused when compiling a compiler program
