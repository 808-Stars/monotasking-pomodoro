/** Measured pagination: preserve modules first, then split at child/row boundaries. */
export function columnPages(count:number,width:number):number[][]{
  const size=Math.max(1,Math.floor(width/150)-1);
  if(count<=Math.max(2,Math.floor(width/150)))return [Array.from({length:count},(_,i)=>i)];
  return Array.from({length:Math.ceil((count-1)/size)},(_,page)=>[0,...Array.from({length:Math.min(size,count-1-page*size)},(_,i)=>1+page*size+i)]);
}

export function ignoresPagingKey(target:EventTarget|null):boolean{
  return target instanceof Element&&!!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"]');
}

export function paginateWiki(source:HTMLElement,probe:HTMLElement,height:number,width:number):HTMLElement[]{
  const clone=<T extends Node>(node:T)=>node.cloneNode(true) as T;
  const shallow=(node:HTMLElement)=>node.cloneNode(false) as HTMLElement;
  const measure=(node:HTMLElement)=>{
    probe.replaceChildren(clone(node));
    return Math.max(probe.scrollHeight,probe.getBoundingClientRect().height);
  };
  let tableId=0;
  function split(node:HTMLElement,fits:(node:HTMLElement)=>boolean):HTMLElement[]{
    // Tables always pass through column pagination, even if their height fits.
    if(node.matches('.wiki-table-scroll'))return splitTable(node,fits);
    if(!node.querySelector('table')&&fits(node))return [clone(node)];
    const children=Array.from(node.children) as HTMLElement[];
    if(!children.length||node.matches('p,pre,li,dt,dd,summary,img')){
      const whole=clone(node);
      if(!fits(whole)){
        // An indivisible paragraph/formula stays intact; reduce only that module.
        let scale=1;
        while(scale>.2&&!fits(whole)){scale-=.05;whole.style.zoom=String(scale);}
        whole.dataset.wikiScaled='true';
      }
      return [whole];
    }
    // A repeated section title gives continuation pages their reading context.
    const prefix:HTMLElement[]=[];
    if(children[0]?.matches('h2,h3,h4,summary'))prefix.push(children.shift()!);
    const fresh=()=>{const box=shallow(node);prefix.forEach(p=>box.append(clone(p)));return box;};
    const pages:HTMLElement[]=[];
    let current=fresh(),count=0;
    const flush=()=>{if(count){pages.push(current);current=fresh();count=0;}};
    for(const child of children){
      const pieces=split(child,piece=>{const wrapper=fresh();wrapper.append(clone(piece));return fits(wrapper);});
      for(const piece of pieces){
        const trial=clone(current);trial.append(clone(piece));
        const tables=(element:HTMLElement)=>[...(element.matches('[data-wiki-table]')?[element]:[]),...element.querySelectorAll<HTMLElement>('[data-wiki-table]')];
        const columnChange=tables(current).some(a=>tables(piece).some(b=>a.dataset.wikiTable===b.dataset.wikiTable&&a.dataset.wikiColumn!==b.dataset.wikiColumn));
        if(count&&(!fits(trial)||columnChange))flush();
        current.append(piece);count++;
      }
    }
    flush();
    return pages.length?pages:[clone(node)];
  }
  function splitTable(node:HTMLElement,fits:(node:HTMLElement)=>boolean):HTMLElement[]{
    const table=node.querySelector('table');
    if(!table)return [clone(node)];
    const rows=Array.from(table.tBodies[0]?.rows??[]);
    const columns=columnPages(table.tHead?.rows[0]?.cells.length??0,width);
    const id=String(tableId++),pages:HTMLElement[]=[];
    columns.forEach((indexes,column)=>{
      const selectRow=(row:HTMLTableRowElement)=>{
        const result=row.cloneNode(false) as HTMLTableRowElement;
        indexes.forEach(i=>{if(row.cells[i])result.append(clone(row.cells[i]));});return result;
      };
      const fresh=(start:number)=>{
        const box=shallow(node);box.dataset.wikiTable=id;box.dataset.wikiColumn=String(column);box.dataset.wikiRow=String(start);
        if(columns.length>1){
          const nav=document.createElement('nav');nav.className='wiki-table-pages';nav.setAttribute('aria-label','表格列分页');
          const previous=document.createElement('button');previous.type='button';previous.textContent='← 前列';previous.dataset.wikiColumnStep='-1';previous.disabled=column===0;
          const label=document.createElement('span');label.textContent=`列页 ${column+1} / ${columns.length} · 首列固定`;
          const next=document.createElement('button');next.type='button';next.textContent='后列 →';next.dataset.wikiColumnStep='1';next.disabled=column===columns.length-1;
          nav.append(previous,label,next);box.append(nav);
        }
        const result=table.cloneNode(false) as HTMLTableElement;
        if(table.tHead){const head=document.createElement('thead');Array.from(table.tHead.rows).forEach(row=>head.append(selectRow(row)));result.append(head);}
        result.append(document.createElement('tbody'));box.append(result);return box;
      };
      let current=fresh(0),count=0;
      rows.forEach((row,index)=>{
        const trial=clone(current);trial.querySelector('tbody')!.append(selectRow(row));
        if(count&&!fits(trial)){pages.push(current);current=fresh(index);count=0;}
        current.querySelector('tbody')!.append(selectRow(row));count++;
        if(count===1&&!fits(current)){
          let scale=1;
          while(scale>.2&&!fits(current)){scale-=.05;current.style.zoom=String(scale);}
          current.dataset.wikiScaled='true';
        }
      });
      pages.push(current);
    });
    return pages;
  }
  const root=clone(source);
  root.className='wiki-page-content';
  root.removeAttribute('style');root.removeAttribute('aria-hidden');root.removeAttribute('inert');
  root.querySelectorAll<HTMLElement>('[data-wiki-anchor]').forEach(el=>{el.id=el.dataset.wikiAnchor!;});
  const pages=split(root,node=>measure(node)<=height-4);
  // Repeated titles retain the hash only on the first occurrence.
  const ids=new Set<string>();
  pages.forEach((page,index)=>{
    const replacements=new Map<string,string>();
    page.querySelectorAll<HTMLElement>('[id]').forEach(el=>{
      const id=el.id;
      if(ids.has(id)){el.dataset.wikiContinuation=id;el.id=`${id}--wiki-page-${index+1}`;replacements.set(id,el.id);}else ids.add(id);
    });
    page.querySelectorAll<HTMLElement>('[aria-labelledby]').forEach(el=>{
      el.setAttribute('aria-labelledby',el.getAttribute('aria-labelledby')!.split(' ').map(id=>replacements.get(id)??id).join(' '));
    });
  });
  probe.replaceChildren();return pages;
}
