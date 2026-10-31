import {createBattle, type BattleState, type BuffId} from "../game/battle.ts";
import {createGame, type Resource} from "../game/economy.ts";
import {migrateCamp} from "../game/camp/migrate.ts";
import {snapshotBuild} from "../game/tavern.ts";
import {confirmedSkills,ppCapacity} from "../game/confirmedSkills.ts";

export type WeaknessPreview = "default" | "weapons" | "elements";
export type StatusPreview = "default" | "many";
const parties = [
  ["warrior","scholar","cleric","merchant"],
  ["dancer","thief","hunter","apothecary"],
];

/** Direct PP edits are disposable theatre controls, not battle commands. */
export function withTheatrePP(battle:BattleState,targetId:string,value:number):BattleState {
  if(!Number.isFinite(value))throw new Error("请输入有效的PP数值。");
  if(targetId!=="all"&&!battle.party.some(unit=>unit.id===targetId))throw new Error("请选择当前队伍中的PP测试角色。");
  const next=structuredClone(battle);
  const pp=Math.max(0,Math.min(100,Math.floor(value)));
  for(const unit of next.party)if(targetId==="all"||unit.id===targetId)unit.latent=Math.min(ppCapacity(unit),pp);
  return next;
}

/** All confirmed entries can be tried without buying skills or touching saves. */
export function withConfirmedTheatreSkills(input:BattleState):BattleState {
  const battle=structuredClone(input);
  for(const unit of battle.party){
    unit.skills=[...new Set([...(unit.skills??[]),...confirmedSkills.filter(s=>s.job===unit.id&&(s.kind==="active"||s.kind==="ex")).map(s=>s.id)])];
    unit.supports=[...new Set([...(unit.supports??[]),...confirmedSkills.filter(s=>s.job===unit.id&&s.kind==="support").map(s=>s.id)])];
    unit.sp=unit.maxSp;unit.bp=5;unit.latent=ppCapacity(unit);
  }
  return battle;
}

/** Disposable theatre fixtures only; never read or write player saves. */
export function createTheatreBattle(resource:Resource|"final", group:number, preview:WeaknessPreview="default", statusPreview:StatusPreview="default", finalStage:1|2=1):BattleState {
  const game=migrateCamp(createGame(20261008));
  game.camp!.party=[...parties[group]];
  const battle=createBattle(game,resource==="final"?"coin":resource,resource==="final"?{finalStage,sandbox:true}:{});
  if(resource==="final") battle.finale={stage:finalStage,snapshot:snapshotBuild(game),lockedGame:structuredClone(game)};
  battle.sandbox=true;
  if(preview!=="default") {
    battle.enemies[0].weaknesses=preview==="weapons"
      ? ["剑","枪","弓","扇","斧","杖"] : ["火","水","木","风","土","雷"];
  }
  battle.discoveredWeaknesses=[...battle.enemies[0].weaknesses];
  for(const u of battle.party) { u.bp=3; u.latent=100; u.hp=Math.floor(u.maxHp*.65); }
  const first=battle.current.findIndex(n=>n.unitId===battle.party[0].id);
  if(first>0) battle.current.unshift(...battle.current.splice(first,1));
  return statusPreview==="many"?withManyTheatreStatuses(battle):battle;
}

/** Replace the dense debug effects, without restarting or mutating the input battle. */
export function withManyTheatreStatuses(battle:BattleState):BattleState {
  const next=structuredClone(battle);
    // Deliberately dense UI fixture, not a natural battle or a new source of buffs.
    for(const [index,u] of [...next.enemies,...next.party].entries()) {
      u.statuses={
        爆破:{turns:3,damageStacks:2,potency:120},
        凝滞:{turns:2},沉默:{turns:3},悬浮:{turns:2},侵蚀:{turns:4,potency:30},混乱:{turns:2},
      };
      u.buffs={};
      for(const [axisIndex,axis] of ["物攻","属攻","物防","属防","速度"].entries())
        u.buffs[`${axis}${(index+axisIndex)%2===0?"提升":"下降"}` as BuffId]=3+axisIndex%3;
      u.ap=Math.floor(u.tenacity*(.25+index*.15));
      u.apLastType="混乱";
      u.evasionCharges=3;
      u.physicalEvasionCharges=2;
      u.defending=true;
      u.medicineRecovery={hp:3,sp:2};
      u.itemAllTurns=2;
      u.spellCharges={large:2,grand:1};
    }
  return next;
}
