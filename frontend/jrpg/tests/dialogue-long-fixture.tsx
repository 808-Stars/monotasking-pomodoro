import {createRoot} from 'react-dom/client';
import {createElement} from 'react';
import {DialogueText} from '../src/features/camp/DialogueText.tsx';
export async function checkLong(){
 const host=document.createElement('div');host.className='camp-layout';host.style.cssText='position:fixed;inset:0;width:1920px;height:1080px;z-index:20000';document.body.append(host);
 const text='这味药快研好了。先把袖子卷起来，让我看看伤口。'.repeat(8);
 const root=createRoot(host);root.render(createElement('div',{className:'camp-conversation'},createElement(DialogueText,{text})));
 await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
 const spans=[...host.querySelectorAll<HTMLElement>('.spoken-line')];
 const frame=host.querySelector<HTMLElement>('.camp-conversation')!,style=getComputedStyle(frame);
 const available=frame.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-28;
 const result={lines:spans.length,fits:spans.every(n=>n.offsetWidth<=available),complete:spans.map(n=>n.textContent).join('')===text};root.unmount();host.remove();return result;
}
