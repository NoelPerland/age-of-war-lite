import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
let source=readFileSync(new URL('../src/game/save.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/export /g,'');
source=ts.transpile(source,{target:ts.ScriptTarget.ES2022});
for(const failure of ['read','write']) {
const context=vm.createContext({Phaser:{Math:{Clamp:(v,min,max)=>Math.min(max,Math.max(min,v))}},SAVE_KEY:'save',DIFFICULTY_OPTIONS:[{id:'normal'}],window:{localStorage:{getItem(){if(failure==='read')throw Error('blocked');return JSON.stringify({bestScore:20,bestAgeReached:2,muted:false,difficulty:'normal'})},setItem(){throw Error('full')}}}});
vm.runInContext(source,context);
assert.equal(vm.runInContext('loadSave().bestScore',context),failure==='read'?0:20);
assert.doesNotThrow(()=>vm.runInContext('mergeSave({bestScore:42})',context));
assert.equal(vm.runInContext('loadSave().bestScore',context),42);
assert.equal(vm.runInContext('mergeSave({muted:true}).bestScore',context),42);
assert.equal(vm.runInContext('loadSave().muted',context),true);
}
console.log('Age save: valid disk save retained; blocked/full storage preserves current-tab progress.');
