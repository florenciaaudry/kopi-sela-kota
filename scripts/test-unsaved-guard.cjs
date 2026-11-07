/* eslint-disable @typescript-eslint/no-require-imports -- Behavioral event tests for accidental loss of draft edits. */
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),ts=require('typescript');
const doc=new Map(),win=new Map();let cleanup,prompts=0,answer=false;
class Element{closest(){return null;}}
class Form extends Element{isConnected=true;}
class Input extends Element{constructor(form){super();this.form=form;}closest(){return this.form;}}
class Anchor extends Element{constructor(href){super();this.href=href;}closest(){return this;}}
const location=new URL('http://127.0.0.1:3000/quotations');
const context={exports:{},require:name=>{assert.equal(name,'react');return {useEffect:run=>{cleanup=run();}};},Element,HTMLFormElement:Form,URL,location,document:{addEventListener:(n,f)=>doc.set(n,f),removeEventListener:n=>doc.delete(n)},window:{addEventListener:(n,f)=>win.set(n,f),removeEventListener:n=>win.delete(n),confirm:()=>{prompts++;return answer;}}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/(erp)/unsaved-changes-guard.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);context.exports.UnsavedChangesGuard();
const form=new Form();const edit=()=>doc.get('input')({target:new Input(form)});
function click(url){const event={button:0,target:new Anchor(url),preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};doc.get('click')(event);return event;}
edit();let event=click('http://127.0.0.1:3000/sales');assert.ok(event.prevented&&event.stopped);assert.equal(prompts,1);
event=click(location.href+'#details');assert.ok(!event.prevented);assert.equal(prompts,1);
let unload={preventDefault(){this.prevented=true;}};win.get('beforeunload')(unload);assert.ok(unload.prevented);
doc.get('reset')({target:form});assert.ok(!click('http://127.0.0.1:3000/sales').prevented);assert.equal(prompts,1);
edit();doc.get('submit')({target:form});assert.ok(!click('http://127.0.0.1:3000/sales').prevented);assert.equal(prompts,1);
edit();answer=true;assert.ok(!click('http://127.0.0.1:3000/sales').prevented);assert.equal(prompts,2);answer=false;assert.ok(!click('http://127.0.0.1:3000/sales').prevented);
edit();form.isConnected=false;unload={preventDefault(){this.prevented=true;}};win.get('beforeunload')(unload);assert.ok(!unload.prevented);
form.isConnected=true;edit();let blocked={target:new Form(),preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};
doc.get('submit')(blocked);assert.ok(blocked.prevented&&blocked.stopped);answer=true;doc.get('submit')({target:new Form()});answer=false;assert.ok(!click('http://127.0.0.1:3000/sales').prevented);
cleanup();assert.equal(doc.size,0);assert.equal(win.size,0);
console.log('PASS unsaved changes: cancel Back, same-page anchors, reload warning, Discard reset, Save navigation, confirmed leave, stale form cleanup and listener cleanup.');

let state=0;const handlers=new Map(),details={open:true};let resets=0;
const root={querySelectorAll:()=>[{dispatchEvent:()=>{resets++;}}],closest:()=>details,addEventListener:(name,handler)=>handlers.set(name,handler),removeEventListener:name=>handlers.delete(name)};
const editContext={exports:{},require:name=>name==='react'?{useState:()=>[state,fn=>{state=fn(state);}]}:{jsx:(type,props,key)=>({type,props,key})},Event};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/(erp)/edit-session.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,editContext);
let editor=editContext.exports.EditSession({children:'form'});assert.equal(editor.key,0);const remove=editor.props.ref(root);handlers.get('erp-discard')();assert.equal(resets,1);assert.equal(details.open,false);editor=editContext.exports.EditSession({children:'form'});assert.equal(editor.key,1);remove();assert.equal(handlers.size,0);
console.log('PASS Discard: reset notification, close editor, change React key to remount controlled inputs, remove listener; unrelated Confirm/Logout blocked while dirty.');
