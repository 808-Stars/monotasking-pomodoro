import {useState} from 'react';
import {heroStats,type GameState} from '../../game/economy.ts';
import {jobNames} from '../../game/camp/catalog.ts';

/** Draft formation only. The caller still previews and commits through setParty. */
export default function PartyFormation({game,party,onDraft,onSave,busy}:{game:GameState;party:string[];onDraft:(ids:string[])=>void;onSave:()=>void;busy:boolean}){
 const [seat,setSeat]=useState(0);
 const numerals=['Ⅰ','Ⅱ','Ⅲ','Ⅳ'];
 function choose(id:string){
  const index=party.indexOf(id);
  if(index>=0){setSeat(index);return;}
  if(party.length<4){onDraft([...party,id]);setSeat(party.length);}
  else onDraft(party.map((old,i)=>i===seat?id:old));
 }
 return <section className="formation-stage" aria-label="四人编队">
  <div className="formation-main">
   <div className="formation-heading"><h3>同行四席</h3><span>{party.length} / 4 人</span></div>
   <div className="formation-seats">
    {numerals.map((number,i)=>{
     const id=party[i],stats=id?heroStats(id,game):null;
     return <article className={`formation-seat ${seat===i?'seat-selected':''}`} key={number}>
      <button type="button" aria-label={`选择第${i+1}席${id?`：${jobNames[id]}`:'：空位'}`} aria-pressed={seat===i} onClick={()=>setSeat(i)}>
       <span className="seat-number">{number}</span>
       {id?<><img src={`/jrpg/assets/portraits/${id}.webp`} alt={jobNames[id]} draggable={false}/><strong>{jobNames[id]}</strong>
        <small>{jobNames[game.camp?.equippedSubjobs[id]??'']??'未配副职业'}</small>
        <span className="seat-vitals"><span>HP <b>{game.heroes[id].hp}</b><small>/{stats!.maxHp}</small></span><span>SP <b>{game.heroes[id].sp}</b><small>/{stats!.maxSp}</small></span></span>
       </>:<span className="seat-empty">等待同行者</span>}
      </button>
      {id&&<button type="button" className="seat-remove" disabled={busy} aria-label={`${jobNames[id]}转为候补`} onClick={()=>onDraft(party.filter(x=>x!==id))}>转为候补</button>}
     </article>;
    })}
   </div>
   <div className="formation-message"><b>第{seat+1}席</b><span>选择右侧旅人替换此席；队伍满四人后即可确认。</span></div>
   <div className="formation-confirm"><small>本次调整不消耗体力，不恢复HP/SP。</small><button type="button" className="primary" disabled={busy||party.length!==4} onClick={onSave}>保存配队</button></div>
  </div>
  <aside className="formation-reserves"><h3>同行旅人</h3><p>选择席位，再选择旅人</p>
   <div className="formation-reserve-list">{Object.entries(jobNames).map(([id,name])=><button type="button" key={id} disabled={busy} aria-pressed={party.includes(id)} onClick={()=>choose(id)}>
    <img src={`/jrpg/assets/head-logos/${id}.webp`} alt="" draggable={false}/><span>{name}<small>{party.includes(id)?`第${party.indexOf(id)+1}席`:'候补'}</small></span>
   </button>)}</div>
  </aside>
 </section>;
}
