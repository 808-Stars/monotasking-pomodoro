import {useEffect} from 'react';
import {isEditingTarget} from '../../presentation/keyboard.ts';

const pagerSelector='[data-page-count]';

function visibleWithin(node:HTMLElement,scope:HTMLElement){
 if(!node.isConnected||!scope.contains(node)||node.closest('[hidden],[inert]'))return false;
 const rect=node.getBoundingClientRect();
 if(!rect.width||!rect.height||getComputedStyle(node).visibility==='hidden')return false;
 const overlaps=(box:DOMRect)=>rect.right>box.left&&rect.left<box.right&&rect.bottom>box.top&&rect.top<box.bottom;
 if(!overlaps(scope.getBoundingClientRect()))return false;
 for(let parent=node.parentElement;parent&&parent!==scope;parent=parent.parentElement){
  if(parent.classList.contains('book-page-viewport')&&!overlaps(parent.getBoundingClientRect()))return false;
 }
 return true;
}

/** One camp-wide owner, independent of focus being inside a pager. */
export function useCampPagination(enabled:boolean){
 useEffect(()=>{
  if(!enabled)return;
  let previousScope:HTMLElement|null=null,lastPager:HTMLElement|null=null;
  const scope=()=>document.querySelector<HTMLElement>('[data-camp-window]')
   ??document.querySelector<HTMLElement>('.camp-layout #camp-navigation')
   ??document.querySelector<HTMLElement>('.camp-layout');
  const usable=(node:HTMLElement|null,root:HTMLElement)=>!!node
   &&Number(node.dataset.pageCount)>1&&visibleWithin(node,root);
  const nearest=(target:EventTarget|null,root:HTMLElement)=>{
   for(let node=target instanceof Element?target.closest<HTMLElement>(pagerSelector):null;node&&root.contains(node);node=node.parentElement?.closest<HTMLElement>(pagerSelector)??null){
    if(usable(node,root))return node;
   }
   return null;
  };
  const currentScope=()=>{
   const root=scope();if(root!==previousScope){previousScope=root;lastPager=null;}return root;
  };
  const remember=(event:Event)=>{
   const root=currentScope();if(!root)return;
   const pager=nearest(event.target,root);if(pager)lastPager=pager;
  };
  const key=(event:KeyboardEvent)=>{
   if(event.defaultPrevented||event.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||isEditingTarget(event.target))return;
   const name=event.key.toLowerCase();
   const step=name==='a'||name==='arrowleft'?-1:name==='d'||name==='arrowright'?1:0;
   if(!step)return;
   const root=currentScope();if(!root)return;
   const pager=nearest(event.target,root)??(usable(lastPager,root)?lastPager:null)
    ??Array.from(root.querySelectorAll<HTMLElement>(pagerSelector)).find(node=>usable(node,root));
   if(!pager)return;
   // Consume even at a page boundary: never fall through into another column.
   event.preventDefault();event.stopImmediatePropagation();lastPager=pager;
   const button=pager.querySelector<HTMLButtonElement>(`:scope > .page-turns button[data-page-step="${step}"]`);
   if(button&&!button.disabled)button.click();
  };
  document.addEventListener('keydown',key,true);
  document.addEventListener('focusin',remember,true);
  document.addEventListener('pointerdown',remember,true);
  return()=>{
   document.removeEventListener('keydown',key,true);
   document.removeEventListener('focusin',remember,true);
   document.removeEventListener('pointerdown',remember,true);
  };
 },[enabled]);
}
