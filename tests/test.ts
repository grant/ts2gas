import fs from 'node:fs';
import type { PackageJson } from 'type-fest';
import { version } from 'typescript';
import ts2gas from '../src/index';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8')) as Required<PackageJson>;

function trimWhitespace(template: string): string {
  const newlineIndex = template.indexOf('\n');

  if (newlineIndex === -1) return template;
  if (template.slice(0, newlineIndex).trim().length === 0) return trimWhitespace(template.slice(newlineIndex + 1));

  const tabOffset = template.search(/\S/);
  return template.replaceAll(new RegExp(`^ {${tabOffset}}`, 'gm'), '').trim();
}

describe('ts2gas', () => {
  test('Const', () => {
    const typescript = `const hi:string = \`Hi \${1 + 2}\`;`;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var hi = "Hi ".concat(1 + 2);
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Class', () => {
    const typescript = `
      class Hamburger {
        constructor() {
          // This is the constructor.
        }
        listToppings() {
          // This is a method.
        }
      }
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var Hamburger = /** @class */ (function () {
          function Hamburger() {
              // This is the constructor.
          }
          Hamburger.prototype.listToppings = function () {
              // This is a method.
          };
          return Hamburger;
      }());
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Template Strings', () => {
    const typescript = `
      var name = 'Grant';
      var age = 42;
      console.log(\`Hello! My name is \${name}, and I am not \${age} years old.\`);
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var name = 'Grant';
      var age = 42;
      console.log("Hello! My name is ".concat(name, ", and I am not ").concat(age, " years old."));
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Array Spread', () => {
    const typescript = `
      let cde = ['c', 'd', 'e'];
      let scale = ['a', 'b', ...cde, 'f', 'g'];
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
          if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
              if (ar || !(i in from)) {
                  if (!ar) ar = Array.prototype.slice.call(from, 0, i);
                  ar[i] = from[i];
              }
          }
          return to.concat(ar || Array.prototype.slice.call(from));
      };
      var cde = ['c', 'd', 'e'];
      var scale = __spreadArray(__spreadArray(['a', 'b'], cde, true), ['f', 'g'], false);
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Destructuring', () => {
    const typescript = `
      let jane = { firstName: 'Jane', lastName: 'Doe'};
      let john = { firstName: 'John', lastName: 'Doe', middleName: 'Smith' }
      function sayName({firstName, lastName, middleName = 'N/A'}) {
        console.log(\`Hello \${firstName} \${middleName} \${lastName}\`)
      }
      sayName(jane) // -> Hello Jane N/A Doe
      sayName(john) // -> Hello John Smith Doe
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var jane = { firstName: 'Jane', lastName: 'Doe' };
      var john = { firstName: 'John', lastName: 'Doe', middleName: 'Smith' };
      function sayName(_a) {
          var firstName = _a.firstName, lastName = _a.lastName, _b = _a.middleName, middleName = _b === void 0 ? 'N/A' : _b;
          console.log("Hello ".concat(firstName, " ").concat(middleName, " ").concat(lastName));
      }
      sayName(jane); // -> Hello Jane N/A Doe
      sayName(john); // -> Hello John Smith Doe
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Import', () => {
    const typescript = `
      import ContentAlignment = GoogleAppsScript.Slides.ContentAlignment;
      import GmailMessage = GoogleAppsScript.Gmail.GmailMessage;

      function getCurrentMessage():GmailMessage {
        return GmailApp.createDraft("", "", "").send();
      }
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      //import ContentAlignment = GoogleAppsScript.Slides.ContentAlignment;
      //import GmailMessage = GoogleAppsScript.Gmail.GmailMessage;
      function getCurrentMessage() {
          return GmailApp.createDraft("", "", "").send();
      }
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Export', () => {
    const typescript = `export const pi = 3.141592;`;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var exports = exports || {};
      var module = module || { exports: exports };
      exports.pi = void 0;
      exports.pi = 3.141592;
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Export Default', () => {
    const typescript = `export default const pi = 3.141592;`;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var exports = exports || {};
      var module = module || { exports: exports };
      var pi = 3.141592;
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Module Exports', () => {
    const typescript = `module.exports = 3.14;`;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var exports = exports || {};
      var module = module || { exports: exports };
      module.exports = 3.14;
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Module Exports Object', () => {
    const typescript = `module.exports.foo = {};`;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var exports = exports || {};
      var module = module || { exports: exports };
      module.exports.foo = {};
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Require', () => {
    const typescript = `const a = require('foo');`;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var a = require('foo');
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Export From', () => {
    const typescript = `export * from 'file'
  export { foo, bar } from "file"`;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var exports = exports || {};
      var module = module || { exports: exports };
      //export * from 'file'
      //export { foo, bar } from "file"
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Multiline Imports', () => {
    const typescript = `
      // next statement will be ignored
      import ContentAlignment
      = GoogleAppsScript.Slides.ContentAlignment;
      // now resume with next statement
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      //import ContentAlignment\\n= GoogleAppsScript.Slides.ContentAlignment;
      // now resume with next statement
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Multiline Exports', () => {
    const typescript = `
      // next statement will be ignored
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
      // now resume with next statement
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var exports = exports || {};
      var module = module || { exports: exports };
      exports.ZipCodeValidator = exports.foo = exports.Client = exports.Languages = void 0;
      //export { foo, bar }\\n  from "file";
      // next statement will be preserved
      /** Supported languages for localized data */
      var Languages;
      (function (Languages) {
          /** English (USA) */
          Languages["eng_us"] = "eng_us";
          /** French (France) */
          Languages["fre_fr"] = "fre_fr";
      })(Languages = exports.Languages || (exports.Languages = {}));
      var Client = /** @class */ (function () {
          function Client() {
          }
          return Client;
      }());
      exports.Client = Client;
      function foo() { }
      exports.foo = foo;
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Import From', () => {
    const typescript = `
      import Module from 'TypeScriptModule1';
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
      const subModule5 = new SubModule5();
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var exports = exports || {};
      var module = module || { exports: exports };
      //import Module from 'TypeScriptModule1';
      var module = new Module();
      //import { SubModule } from "TypeScriptModule2";
      var subModule = new SubModule();
      //import { SubModule2, SubModule3 } from "TypeScriptModule3";
      var subModule2 = new SubModule2();
      var subModule3 = new SubModule3();
      //import {\\n  SubModule4,\\n  SubModule5\\n} from "TypeScriptModule4";
      var subModule4 = new SubModule4();
      var subModule5 = new SubModule5();
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Namespace', () => {
    const typescript = `
      namespace Pop {
        export const goes = 'Goes';
        export function The(): void {}
        export class Wza {}
      }
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var Pop;
      (function (Pop) {
          Pop.goes = 'Goes';
          function The() { }
          Pop.The = The;
          var Wza = /** @class */ (function () {
              function Wza() {
              }
              return Wza;
          }());
          Pop.Wza = Wza;
      })(Pop || (Pop = {}));
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('This Keyword', () => {
    const typescript = `
      // code in this test semantically incorrect
      getAllInstancesByUnits(): UnitMemberInstances {
        for (const row of data) {
          // following 'this' keyword should remain as is
          const instances = row.slice(this.columnOffset - 1);
          instances.forEach((e, i) => {
            // following 'this' keyword must be substitute with '_this'
            const u = this.toUnitInstance(e);
          });
        }
      }
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var _this = this;
      // code in this test semantically incorrect
      getAllInstancesByUnits();
      UnitMemberInstances;
      {
          for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
              var row = data_1[_i];
              // following 'this' keyword should remain as is
              var instances = row.slice(this.columnOffset - 1);
              instances.forEach(function (e, i) {
                  // following 'this' keyword must be substitute with '_this'
                  var u = _this.toUnitInstance(e);
              });
          }
      }
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Hello World', () => {
    const typescript = `
      const writeToLog = (message: string) => console.info(message);

      let words = ['hello', 'world'];
      writeToLog(\`\${words.join(' ')}\`);`;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var writeToLog = function (message) { return console.info(message); };
      var words = ['hello', 'world'];
      writeToLog("".concat(words.join(' ')));
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Default Params', () => {
    const typescript = `
          function JsonResponseHandler(url: string,
          query = {},
          params = {muteHttpExceptions: true},
          cacheName: string, cacheTime = 3600) {
        // ...
      }
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      function JsonResponseHandler(url, query, params, cacheName, cacheTime) {
          if (query === void 0) { query = {}; }
          if (params === void 0) { params = { muteHttpExceptions: true }; }
          if (cacheTime === void 0) { cacheTime = 3600; }
          // ...
      }
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Export Import Workaround Part1', () => {
    const typescript = `
      export const ICONS = {
        email: \`foo.png\`;
      };
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var exports = exports || {};
      var module = module || { exports: exports };
      exports.ICONS = void 0;
      exports.ICONS = {
          email: "foo.png"
      };
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Export Import Workaround Part2', () => {
    const typescript = `
      import { ICONS } from './package';

      type _i_ICONS = typeof ICONS;
      declare namespace exports {
        const ICONS: _i_ICONS;
      }

      exports.ICONS.email;
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var exports = exports || {};
      var module = module || { exports: exports };
      //import { ICONS } from './package';
      exports.ICONS.email;
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('Export Import Namespace Workaround', () => {
    const typescript = `
      namespace Package {
        export function foo() {}
      }

      Package.foo();

      const nameIWantForMyImports = Package.foo;
      nameIWantForMyImports();`;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var Package;
      (function (Package) {
          function foo() { }
          Package.foo = foo;
      })(Package || (Package = {}));
      Package.foo();
      var nameIWantForMyImports = Package.foo;
      nameIWantForMyImports();
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('TypeScript 34x highOrder', () => {
    const typescript = `
          // Higher order function type inference
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
      const t2 = flipped(true, 0);  // [number, boolean]
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      var listBox = pipe(list, box); // <T>(a: T) => { value: T[] }
      var boxList = pipe(box, list); // <V>(x: V) => { value: V }[]
      var x1 = listBox(42); // { value: number[] }
      var x2 = boxList('hello'); // { value: string }[]
      var flip = function (f) { return function (b, a) { return f(a, b); }; };
      var zip = function (x, y) { return [x, y]; };
      var flipped = flip(zip); // <T, U>(b: U, a: T) => [T, U]
      var t1 = flipped(10, 'hello'); // [string, number]
      var t2 = flipped(true, 0); // [number, boolean]
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('TypeScript 34x improvedReadonly', () => {
    const typescript = `
      // Improved support for read-only arrays and tuples
      function f1(mt: [number, number], rt: readonly [number, number]) {
        mt[0] = 1;  // Ok
        // rt[0] = 1;  // Error, read-only element
      }

      // next function declaration crashes with Typescript version < 3.4.4
      function f2(ma: string[], ra: readonly string[], mt: [string, string], rt: readonly [string, string]) {
        //   ma = ra;  // Error
        ma = mt;  // Ok
        //   ma = rt;  // Error
        ra = ma;  // Ok
        ra = mt;  // Ok
        ra = rt;  // Ok
        //   mt = ma;  // Error
        //   mt = ra;  // Error
        //   mt = rt;  // Error
        //   rt = ma;  // Error
        //   rt = ra;  // Error
        rt = mt;  // Ok
      }

      type ReadWrite<T> = { -readonly [P in keyof T] : T[P] };

      type T0 = Readonly<string[]>;  // readonly string[]
      type T1 = Readonly<[number, number]>;  // readonly [number, number]
      type T2 = Partial<Readonly<string[]>>;  // readonly (string | undefined)[]
      type T3 = Readonly<Partial<string[]>>;  // readonly (string | undefined)[]
      type T4 = ReadWrite<Required<T3>>;  // string[]
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      // Improved support for read-only arrays and tuples
      function f1(mt, rt) {
          mt[0] = 1; // Ok
          // rt[0] = 1;  // Error, read-only element
      }
      // next function declaration crashes with Typescript version < 3.4.4
      function f2(ma, ra, mt, rt) {
          //   ma = ra;  // Error
          ma = mt; // Ok
          //   ma = rt;  // Error
          ra = ma; // Ok
          ra = mt; // Ok
          ra = rt; // Ok
          //   mt = ma;  // Error
          //   mt = ra;  // Error
          //   mt = rt;  // Error
          //   rt = ma;  // Error
          //   rt = ra;  // Error
          rt = mt; // Ok
      }
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('TypeScript 34x constContext', () => {
    const typescript = `
      // Const contexts for literal expressions
      let x = 10 as const;  // Type 10
      let y = <const> [10, 20];  // Type readonly [10, 20]
      let z = { text: "hello" } as const;  // Type { readonly text: "hello" }`;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      // Const contexts for literal expressions
      var x = 10; // Type 10
      var y = [10, 20]; // Type readonly [10, 20]
      var z = { text: "hello" }; // Type { readonly text: "hello" }
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });

  test('TypeScript 34x globalThis', () => {
    const typescript = `
        // \`globalThis\`
      // Add globalThis
      // @Filename: one.ts
      var a = 1;
      var b = 2;
      // @Filename: two.js
      this.c = 3;
      const total = globalThis.a + this.b + window.c + this.unknown;
      `;
    const gas = `
      // Compiled using ${packageJson.name} ${packageJson.version} (TypeScript ${version})
      // \`globalThis\`
      // Add globalThis
      // @Filename: one.ts
      var a = 1;
      var b = 2;
      // @Filename: two.js
      this.c = 3;
      var total = globalThis.a + this.b + window.c + this.unknown;
      `;
    expect(ts2gas(trimWhitespace(typescript)).trim()).toBe(trimWhitespace(gas));
  });
});
