import type { BattleState, BuffId, Command, Unit, VisualEvent } from "./battle.ts";
import { random } from "./economy.ts";
import { effectiveBattleStat } from "./battleStats.ts";
import { confirmedById } from "./confirmedSkills.ts";

interface Context {
  s:BattleState; a:Unit; c:Command; b:number; target?:string; events:VisualEvent[];
  hit:(t:Unit,k:number,weapon?:string,magic?:boolean,ap?:number)=>void;
  buff:(t:Unit,id:BuffId,turns:number,exact?:boolean)=>void;
  shield:(t:Unit,amount:number)=>void;
  heal:(t:Unit,amount:number,sp?:boolean)=>void;
  ap:(t:Unit,amount:number)=>void;
  explode:(t:Unit,multiplier:number)=>void;
  refresh:()=>void;
}
const weapons = ["剑","枪","弓","扇","斧","杖"];
export function confirmedEffect({s,a,c,b,target,events,hit,buff,shield,heal,ap,explode,refresh}:Context):boolean {
  const id=c.skill!;
  if(!confirmedById[id])return false;
  const live=(us:Unit[])=>us.filter(u=>u.hp>0);
  const t=[...s.party,...s.enemies].find(u=>u.id===target)??a;
  const broken=(u:Unit)=>u.breakUntil>s.round;
  const landed=(before:number,u:Unit)=>events.slice(before).some(e=>e.type==="Damage"&&e.target===u.id);
  const strike=(u:Unit,k:number,w?:string,magic=false,apAmount?:number)=>{
    const before=events.length;hit(u,k,w,magic,apAmount);return landed(before,u);
  };
  const physical=[1.5,2,2.5,3][b];
  const special=(u:Unit,text:string)=>events.push({type:"Buff",target:u.id,text});
  switch(id){
    case "warrior-1": {
      const weak=t.weaknesses.includes(c.usePP&&c.weapon?c.weapon:"剑");
      if(strike(t,physical,"剑")&&t.hp>0){if(weak)shield(t,[1,1,2,2][b]);else buff(t,"物防下降",1);}break;
    }
    case "warrior-2":
      for(let i=0;i<3&&t.hp>0;i++){
        const was=broken(t);const success=strike(t,[.45,.6,.75,.9][b],"枪");
        if(i===2&&success&&!was&&broken(t)&&t.hp>0)strike(t,[1.8,2.4,3,3.6][b],"枪");
      }break;
    case "warrior-3": {
      let changed=false;
      for(const enemy of live(s.enemies)){const was=broken(enemy);strike(enemy,[1.2,1.6,2,2.4][b],"弓");changed ||= !was&&broken(enemy);}
      if(changed)for(const ally of live(s.party))buff(ally,"物攻提升",1);break;
    }
    case "warrior-4":a.tauntTurns=Math.min(9,(a.tauntTurns??0)+3+b);buff(a,"物防提升",3+b);special(a,`牵制 ${a.tauntTurns}轮 · 单体目标权重×4`);break;
    case "warrior-5":{
      const previous={...a.buffs};
      for(const stat of ["物防提升","属防提升"] as BuffId[])buff(a,stat,2+b+(previous[stat]?1:0));break;
    }
    case "warrior-6":strike(t,[1.2,1.6,2,2.4][b]*(1+2*(1-t.hp/t.maxHp)),"弓");break;
    case "warrior-7":{
      const first={...a.buffs},second={...t.buffs};
      for(const stat of ["物防提升","属防提升"] as BuffId[]){
        delete a.buffs[stat];delete t.buffs[stat];
        if(second[stat])buff(a,stat,second[stat]!,true);
        if(first[stat])buff(t,stat,first[stat]!,true);
        for(const ally of [a,t])if(ally.buffs[stat])ally.buffs[stat]=Math.min(9,ally.buffs[stat]!+b);
      }
      for(const ally of [a,t])events.push({type:"StateSync",target:ally.id,text:"防区交换",buffsAfter:{...ally.buffs}});break;
    }
    case "warrior-8":{
      let count=0;
      for(const w of ["剑","枪","弓"]){
        if(t.hp<=0)break;
        const attribute=c.usePP&&c.weapon?c.weapon:w;
        const weak=t.weaknesses.includes(attribute);
        if(strike(t,1.6*(1+.25*count),w)&&weak)count++;
      }break;
    }
    case "warrior-ex1":
      for(const ally of s.party.filter(u=>(c.targets??[target]).includes(u.id)&&u.hp>0)){
        ally.defending=true;ally.frontRound=s.round+1;special(ally,"相信着你 · 防御，至下次行动开始");
      }break;
    case "warrior-ex2":
      if(strike(t,1.5,"剑")&&t.hp>0&&t.weaknesses[0]!=="剑"&&random(s.rng)<[.2,.3,.4,.5][b]){
        t.weaknesses[0]="剑";special(t,"第一个弱点已改为剑");
      }break;
    case "dancer-1":buff(t,"物攻提升",2+b+(t.buffs["物攻提升"]??0));break;
    case "dancer-2":buff(t,"属攻提升",1+b);t.spDiscountCharges=(t.spDiscountCharges??0)+1+b;special(t,`属性技能减费 ${t.spDiscountCharges}次`);break;
    case "dancer-3":
      for(const enemy of live(s.enemies))strike(enemy,[1,1.3,1.6,2][b]*Math.max(.5,Math.min(3,effectiveBattleStat(a,"speed")/100)),"扇");break;
    case "dancer-4":for(let i=0;i<=b&&t.hp>0;i++)strike(t,.6,"火",true,100);break;
    case "dancer-5":
      buff(t,"速度提升",1+b);
      if(t.buffs["速度提升"])for(const enemy of live(s.enemies))buff(enemy,"速度下降",t.buffs["速度提升"]!);break;
    case "dancer-6":{
      const chosen=(c.targets??[]).map(id=>s.party.find(u=>u.id===id)!);
      const ids=chosen.map(u=>u.id);
      for(const unit of s.party)if(ids.includes(unit.id)||ids.includes(unit.speedSwap?.partnerId??"")){delete unit.speedSwap;delete unit.linkedSpeed;}
      chosen[0].speedSwap={partnerId:chosen[1].id,turns:1+b};chosen[1].speedSwap={partnerId:chosen[0].id,turns:1+b};
      chosen.forEach(u=>special(u,`双人舞 ${1+b}轮`));break;
    }
    case "dancer-7":
      for(let i=0;i<2+b;i++){
        const choice=Math.floor(random(s.rng)*4);
        if(choice===3)ap(t,50);else buff(t,(["速度提升","物攻提升","属攻提升"] as BuffId[])[choice],2);
      }break;
    case "dancer-8":
      for(const ally of live(s.party)){
        for(const stat of Object.keys(ally.buffs) as BuffId[])if(stat.endsWith("提升"))ally.buffs[stat]=Math.min(9,ally.buffs[stat]!+1);
        for(const key of ["tauntTurns","spreadTurns","weaponAffinityTurns"] as const)if(ally[key])ally[key]=Math.min(9,ally[key]!+1);
        if(ally.speedSwap)ally.speedSwap.turns=Math.min(9,ally.speedSwap.turns+1);
        events.push({type:"StateSync",target:ally.id,text:"合奏 · 正向轮次增益延长1轮",buffsAfter:{...ally.buffs}});
      }break;
    case "dancer-pp":
      s.next.forEach(node=>{delete node.fixedOrder;});
      (c.order??[]).forEach((nodeId,index)=>{const node=s.next.find(n=>n.id===nodeId);if(node)node.fixedOrder=index;});
      special(a,`完美交响 · 锁定次轮${c.order?.length??0}个节点`);break;
    case "dancer-ex1":explode(t,s.enemies.includes(t)?1+[.2,.4,.6,.8][b]:1-[.2,.4,.6,.8][b]);break;
    case "dancer-ex2":t.spreadTurns=Math.min(9,(t.spreadTurns??0)+1+b);special(t,`华彩乐段 ${t.spreadTurns}轮`);break;
    case "cleric-pp":t.weaponAffinityTurns=Math.min(9,(t.weaponAffinityTurns??0)+1+b);special(t,`弱点启示 ${t.weaponAffinityTurns}轮`);break;
    case "hunter-pp":break; // Atomic extra-node replacement is handled by resolveCommand.
    default:return false;
  }
  refresh();return true;
}

export const weaponTypes = weapons;
