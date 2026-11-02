import test from 'node:test';
import assert from 'node:assert/strict';
import {dialogueLines} from '../src/presentation/dialogueLines.ts';
const measure=(s:string)=>[...s].length*25;
test('short apothecary dialogue stays in one line; longer text uses actual available width',()=>{
 const text='这味药快研好了。先把袖子卷起来，让我看看伤口。';
 assert.deepEqual(dialogueLines(text,1300,measure),[text]);
 const long=text.repeat(5),lines=dialogueLines(long,1300,measure);
 assert.ok(lines.length>1);assert.equal(lines.join(''),long);assert.ok(lines.every(line=>measure(line)<=1300));
});
test('explicit line breaks and blank lines are preserved without clipping text',()=>{
 assert.deepEqual(dialogueLines('甲\n\n乙',100,measure),['甲','','乙']);
 assert.deepEqual(dialogueLines('甲乙。丙丁',50,measure),['甲','乙。','丙丁']);
});
