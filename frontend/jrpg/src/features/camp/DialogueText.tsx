import {useLayoutEffect,useRef,useState} from 'react';
import {dialogueLines} from '../../presentation/dialogueLines.ts';

/** Resolve lines against the dialogue frame, not a mobile browser's reflowed p. */
export function DialogueText({text}:{text:string}){
 const paragraph=useRef<HTMLParagraphElement>(null),probe=useRef<HTMLSpanElement>(null);
 const [lines,setLines]=useState(()=>text.split('\n'));
 useLayoutEffect(()=>{
  const node=paragraph.current,measure=probe.current,frame=node?.closest<HTMLElement>('.camp-conversation');
  if(!node||!measure||!frame)return;
  let alive=true;
  const layout=()=>{
   if(!alive)return;
   const outer=getComputedStyle(frame),inner=getComputedStyle(node);
   const width=frame.clientWidth-parseFloat(outer.paddingLeft)-parseFloat(outer.paddingRight)-parseFloat(inner.paddingLeft)-parseFloat(inner.paddingRight);
   const next=dialogueLines(text,width-1,value=>{measure.textContent=value;return measure.offsetWidth;});
   measure.textContent=text;
   setLines(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
  };
  layout();const observer=new ResizeObserver(layout);observer.observe(frame);
  void document.fonts.ready.then(layout);document.fonts.addEventListener('loadingdone',layout);
  return()=>{alive=false;observer.disconnect();document.fonts.removeEventListener('loadingdone',layout);};
 },[text]);
 return <><p className="spoken" ref={paragraph}>{lines.map((line,i)=><span className="spoken-line" key={i}>{line||'\u00a0'}</span>)}</p>
  <span ref={probe} className="spoken spoken-measure" data-dialogue-source aria-hidden="true">{text}</span></>;
}
