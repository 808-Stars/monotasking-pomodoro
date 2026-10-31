export interface CardSlot {
  id: string;
  /** Center coordinates and edge length, in field-local CSS pixels. */
  x: number;
  y: number;
  size: number;
  enemy: boolean;
}

export const HERO_STATUS_WIDTH = 260;
export const HERO_STATUS_HEIGHT = 192;

export interface CardReadoutSlot extends CardSlot {
  /** Readout rectangle in visible CSS pixels, not the scaled drawing plane. */
  status: {x:number;y:number;width:number;height:number;placement:"below"|"right"};
}

/** Align opposing card centers vertically and keep their inner edges symmetric. */
export function alignCommandCombatants(slots:CardReadoutSlot[],viewport:{width:number;focusId:string|null}):CardReadoutSlot[] {
  const hero=slots.find(slot=>!slot.enemy&&slot.id===viewport.focusId);
  const enemies=slots.filter(slot=>slot.enemy);
  if(!hero||enemies.length!==1||viewport.width<760)return slots;
  const enemy=enemies[0],center=viewport.width/2;
  const queue=slots.filter(slot=>!slot.enemy&&slot.id!==hero.id
    && Math.abs(slot.y-hero.y)<(slot.size+hero.size)/2);
  const queueLeft=queue.length?Math.min(...queue.map(slot=>slot.x-slot.size/2))-12:viewport.width-8;
  const enemyMin=8+Math.max(enemy.size,enemy.status.width)/2;
  // The readout is below the outgoing portrait, not alongside the queue cards.
  // Preserve its page boundary without letting its old width negate card shrinkage.
  const heroMax=Math.min(queueLeft-hero.size/2,viewport.width-8-hero.status.width/2);
  const available=Math.min(center-enemyMin-enemy.size/2,heroMax-center-hero.size/2);
  if(available<=0)return slots;
  const inner=Math.min(available,Math.max(152,(hero.x-hero.size/2-enemy.x-enemy.size/2)/2)+64);
  return slots.map(slot=>{
    const x=slot.id===enemy.id?center-inner-enemy.size/2:slot.id===hero.id?center+inner+hero.size/2:slot.x;
    const y=slot.id===hero.id?enemy.y:slot.y;
    return x===slot.x&&y===slot.y?slot:{...slot,x,y,status:{...slot.status,
      x:slot.status.x+x-slot.x,y:slot.status.y+y-slot.y}};
  });
}

/** Horizontally center the overlay; lift it clear of the lower readouts. */
export function layoutCommandPanel(slots:readonly CardSlot[],viewport:{width:number;height:number;focusId:string|null}) {
  const focus=slots.find(slot=>!slot.enemy&&slot.id===viewport.focusId);
  const enemies=slots.filter(slot=>slot.enemy);
  if(!focus||!enemies.length||viewport.width<=16||viewport.height<=16)return null;
  const enemyEdge=Math.max(...enemies.map(slot=>slot.x+slot.size/2));
  const heroEdge=focus.x-focus.size/2;
  const clearance=Math.min(viewport.width/2-enemyEdge,heroEdge-viewport.width/2);
  const width=Math.min(viewport.width-16,280,Math.max(120,clearance*2-24))*.85;
  const x=(viewport.width-width)/2;
  const lift=Math.min(160,(viewport.height-16)/4);
  const maxHeight=Math.min(420,viewport.height-16-lift*2);
  const y=viewport.height/2-lift;
  return {x,y,width,maxHeight};
}

/** Bottom party row retains four fixed cells; focus leaves its original cell empty. */
export function layoutCardReadouts(slots:CardSlot[],viewport:{width:number;height:number;focusId:string|null;focusedSize?:number}):CardReadoutSlot[] {
  const {width,height,focusId}=viewport;
  if(!slots.length||width<=0||height<=0)return [];
  const edge=8,gap=12;
  const focused=slots.find(slot=>!slot.enemy&&slot.id===focusId);
  const enemies=slots.filter(slot=>slot.enemy);
  const heroes=slots.filter(slot=>!slot.enemy);
  const statusWidth=Math.min(260,Math.max(160,width*.14));
  const sideStatusHeight=HERO_STATUS_HEIGHT*statusWidth/HERO_STATUS_WIDTH;
  const stackedFocus=!!focused&&width<760;
  const rightWidth=width/2-edge;
  // Retain the previous portrait-size reference; moving the queue must not
  // inflate portraits. The bottom cell width supplies an additional fit bound.
  const queueWidthLimit=width>=760
    ? rightWidth-statusWidth*2-gap*3 : rightWidth-statusWidth-gap;
  const cellWidth=heroes.length ? Math.max(0,(width-edge*2-gap*(heroes.length-1))/heroes.length) : 0;
  const queueSize=heroes.length ? Math.max(0,Math.min(
    ...heroes.map(slot=>slot.size),
    Math.max(32,queueWidthLimit),
    Math.max(0,cellWidth-statusWidth-gap),
    Math.max(0,(height-edge*2-gap*Math.max(0,heroes.length-1))/heroes.length),
  )) : 0;
  const queueBlockWidth=heroes.length ? queueSize+gap+statusWidth : 0;
  // Retained only as the upper combatants' established size-reference boundary.
  const queueLeft=width-edge-queueBlockWidth;
  const rowHeight=Math.max(queueSize,sideStatusHeight);
  const rowTop=Math.max(edge,height-edge-rowHeight);
  const combatHeight=heroes.length ? Math.max(0,rowTop-gap-edge) : height-edge*2;
  const result=new Map<string,CardReadoutSlot>();
  heroes.forEach((slot,index)=>{
    // Skip drawing this cell, but retain its party-order index and horizontal space.
    // The only rendered instance of the focused unit is added below.
    if(slot.id===focused?.id)return;
    const left=edge+index*(cellWidth+gap)+(cellWidth-queueBlockWidth)/2;
    const y=rowTop+rowHeight/2;
    result.set(slot.id,{...slot,x:left+queueSize/2,y,size:queueSize,
      status:{x:left+queueSize+gap,y:y-sideStatusHeight/2,
        width:statusWidth,height:sideStatusHeight,placement:"right"}});
  });
  const belowStatusHeight=192;
  const leftWidth=stackedFocus ? queueLeft-gap-edge : width/2-edge*2;
  const below=(slot:CardSlot,left:number,availableWidth:number,top:number,availableHeight:number)=>{
    const usableWidth=Math.max(0,availableWidth);
    const requestedSize=slot.id===focused?.id ? viewport.focusedSize ?? slot.size : slot.size;
    const minimumPanelWidth=Math.min(statusWidth,usableWidth);
    // A hero readout is one fixed drawing scaled as a whole. Reserve its real
    // scaled height instead of squeezing the same text into a different grid.
    const heightBound=slot.enemy ? availableHeight-belowStatusHeight-gap : Math.min(
      availableHeight-gap-HERO_STATUS_HEIGHT*minimumPanelWidth/HERO_STATUS_WIDTH,
      (availableHeight-gap)/(1+HERO_STATUS_HEIGHT/HERO_STATUS_WIDTH),
    );
    const size=Math.max(0,Math.min(requestedSize,usableWidth,heightBound));
    const panelWidth=Math.min(usableWidth,Math.max(size,Math.min(slot.enemy?320:statusWidth,usableWidth)));
    const panelHeight=slot.enemy ? belowStatusHeight : HERO_STATUS_HEIGHT*panelWidth/HERO_STATUS_WIDTH;
    const groupWidth=Math.max(size,panelWidth);
    const x=Math.max(left+groupWidth/2,Math.min(left+usableWidth-groupWidth/2,slot.enemy&&!stackedFocus ? slot.x : left+usableWidth/2));
    const groupHeight=size+gap+panelHeight;
    const y=top+Math.max(0,(availableHeight-groupHeight)/2)+size/2;
    result.set(slot.id,{...slot,x,y,size,
      status:{x:x-panelWidth/2,y:y+size/2+gap,width:panelWidth,height:panelHeight,placement:"below"}});
  };
  if(stackedFocus) {
    const leftUnits=[...enemies,focused!];
    const cellHeight=(combatHeight-gap*Math.max(0,leftUnits.length-1))/leftUnits.length;
    leftUnits.forEach((slot,index)=>below(slot,edge,leftWidth,edge+index*(cellHeight+gap),cellHeight));
  } else {
    const enemyHeight=(combatHeight-gap*Math.max(0,enemies.length-1))/Math.max(1,enemies.length);
    enemies.forEach((slot,index)=>below(slot,edge,leftWidth,edge+index*(enemyHeight+gap),enemyHeight));
    if(focused) {
      const left=width/2+edge;
      const availableWidth=(heroes.length?queueLeft-gap*2:width-edge)-left;
      below(focused,left,availableWidth,edge,combatHeight);
    }
  }
  // Match the fitted hero, not its pre-clamp size: narrow viewports may reduce
  // the outgoing card to fit its reserved area. Keep the enemy's center and
  // readout width, moving only the readout top to follow the smaller portrait.
  const reference=focused??heroes[0];
  if(reference) {
    const referenceWidth=width<760 ? queueLeft-gap-edge
      : (heroes.length?queueLeft-gap*2:width-edge)-(width/2+edge);
    const referenceHeight=width<760
      ? (combatHeight-gap*enemies.length)/(enemies.length+1) : combatHeight;
    const referenceSize=(focused ? result.get(focused.id)?.size : undefined)
      ?? Math.max(0,Math.min(viewport.focusedSize??reference.size,
        referenceWidth,referenceHeight-belowStatusHeight-gap));
    for(const enemy of enemies) {
      const placed=result.get(enemy.id)!;
      const size=Math.min(placed.size,referenceSize);
      result.set(enemy.id,{...placed,size,status:{...placed.status,y:placed.y+size/2+gap}});
    }
  }
  return slots.map(slot=>{
    const placed=result.get(slot.id)!;
    // Apply one 90% scale at the final layout stage, including enemy turns, so
    // playback cannot restore a larger enemy. Queue portraits remain untouched.
    const size=slot.enemy||slot.id===focused?.id ? placed.size*.9 : placed.size;
    const status=size===placed.size ? placed.status : {...placed.status,y:placed.y+size/2+gap};
    if(!slot.enemy)return {...placed,size,status};
    const panelWidth=Math.min(status.width,Math.max(180,status.width*.85));
    return {...placed,size,status:{...status,width:panelWidth,x:placed.x-panelWidth/2}};
  });
}

interface CardLayoutInput {
  partyIds: readonly string[];
  enemyIds: readonly string[];
  focusId: string | null;
  width: number;
  height: number;
  /** Height before the enlarged queue reserves extra room. */
  referenceHeight?: number;
  /** Available viewport width, not the expanded drawing plane. */
  referenceWidth?: number;
}

const enemyCardScale = 1.875;
const queuedCardScale = .75;
const restingCardScale = 1.125;

/** Keep the outgoing actor enlarged through input and playback, without resizing the queue. */
export function emphasizeCards(slots: CardSlot[], focusId: string | null): CardSlot[] {
  return slots.map(slot => {
    const multiplier = slot.enemy ? 2 : slot.id === focusId ? 1.5 : 1;
    return multiplier === 1 ? slot : {...slot,size:slot.size * multiplier};
  });
}

/** Move the two sides apart in visible pixels, preserving each group's layout. */
export function widenBattleCenter(slots: CardSlot[], viewport: {
  width: number; planeWidth: number; scale: number;
}): CardSlot[] {
  const {width,planeWidth,scale} = viewport;
  if (scale <= 0) return slots;
  const planeLeft = (width - planeWidth * scale) / 2;
  const enemies = slots.filter(slot => slot.enemy);
  const heroes = slots.filter(slot => !slot.enemy);
  const enemyLeft = enemies.length ? Math.min(...enemies.map(slot => planeLeft + (slot.x + 12 - slot.size / 2) * scale)) : 8;
  const heroRight = heroes.length ? Math.max(...heroes.map(slot => planeLeft + (slot.x + 12 + slot.size / 2) * scale)) : width - 8;
  const enemyShift = Math.min(100,Math.max(0,enemyLeft - 8));
  const heroShift = Math.min(100,Math.max(0,width - 8 - heroRight));
  return slots.map(slot => ({...slot,x:slot.x + (slot.enemy ? -enemyShift : heroShift) / scale}));
}

/** Preserve the previous 100% anchor; extra field height never feeds it back. */
export function cardLayoutMetrics(input: CardLayoutInput) {
  const { partyIds, enemyIds } = input;
  const widthReference = input.referenceWidth ?? input.width;
  const width = Number.isFinite(widthReference) ? Math.max(0, widthReference) : 0;
  const reference = input.referenceHeight ?? input.height;
  const height = Number.isFinite(reference) ? Math.max(0, reference) : 0;
  const inset = Math.min(12, width / 20, height / 20);
  const originalGap = Math.min(12, height / 20);
  const gap = originalGap * 2;
  const usableHeight = Math.max(0, height - inset * 2);
  // Deliberately retain the old .75/.5 sizing constraints for the anchor.
  // Changing the anchor with the display scales would cancel relative resizing.
  const restingCount = Math.max(1, partyIds.length);
  const waitingCount = Math.max(1, partyIds.length - 1);
  const enemyCount = Math.max(1, enemyIds.length);
  const base = Math.max(0, Math.min(
    (usableHeight - originalGap * (restingCount - 1)) / (restingCount * .75),
    (usableHeight - originalGap * (waitingCount - 1)) / (waitingCount * .5),
    (usableHeight - originalGap * (enemyCount - 1)) / (enemyCount * 1.25),
    usableHeight,
    Math.max(0, width * .25 - inset * 2),
  ));
  const minimumHeight = Math.max(height,
    partyIds.length * base * restingCardScale + Math.max(0,partyIds.length - 1) * gap + inset * 2,
    enemyIds.length * base * enemyCardScale + Math.max(0,enemyIds.length - 1) * originalGap + inset * 2);
  // Reserve horizontal room only when the configured card sizes require it.
  // This accommodates both focused cards, their frame gap and right inset.
  const minimumWidth = Math.max(width,base * 4 + inset * 6);
  return {base,inset,gap,originalGap,minimumHeight,minimumWidth};
}

/** No timeline sorting or HP filtering: every configured party slot is retained. */
export function layoutCards(input: CardLayoutInput): CardSlot[] {
  const {partyIds,enemyIds} = input;
  const width = Number.isFinite(input.width) ? Math.max(0,input.width) : 0;
  const height = Number.isFinite(input.height) ? Math.max(0,input.height) : 0;
  const focusId = partyIds.includes(input.focusId ?? "") ? input.focusId : null;
  const {base,inset,gap,originalGap} = cardLayoutMetrics(input);
  const slots: CardSlot[] = [];
  const addColumn = (ids: readonly string[], x: number, size: number, enemy: boolean, spacing = gap) => {
    const total = ids.length * size + Math.max(0, ids.length - 1) * spacing;
    const start = (height - total) / 2;
    ids.forEach((id, index) => slots.push({
      id, x, y: start + size / 2 + index * (size + spacing), size, enemy,
    }));
  };
  addColumn(enemyIds, width * .25, base * enemyCardScale, true, originalGap);
  if (!focusId) {
    addColumn(partyIds, width * .75, base * restingCardScale, false);
    return slots;
  }
  const queued = partyIds.filter(id => id !== focusId);
  const queueSlots: CardSlot[] = [];
  const queueSize = base * queuedCardScale;
  const total = queued.length * queueSize + Math.max(0, queued.length - 1) * gap;
  // Bring the queue closer to the out-of-line hero, while keeping their frames
  // apart on narrow windows. The focused hero remains at the previous position.
  const queueX = Math.max(width * .825, width * .625 + (base + queueSize) / 2 + inset);
  queued.forEach((id, index) => queueSlots.push({
    id, x: queueX,
    y: (height - total) / 2 + queueSize / 2 + index * (queueSize + gap),
    size: queueSize, enemy: false,
  }));
  // Output order stays stable even when a different role occupies the left slot.
  for (const id of partyIds) {
    if (id === focusId) slots.push({ id, x: width * .625, y: height / 2, size: base, enemy: false });
    else slots.push(queueSlots.find(slot => slot.id === id)!);
  }
  return slots;
}

/** Spread either hero queue in visible space, keeping the enemy unchanged. */
export function spreadRestingColumn(slots: CardSlot[], viewport: {
  width: number; height: number; planeWidth: number; planeHeight: number;
  scale: number; focusId: string | null;
}): CardSlot[] {
  const focused = slots.find(slot => !slot.enemy && slot.id === viewport.focusId);
  const heroes = slots.filter(slot => !slot.enemy && slot.id !== focused?.id);
  if (!heroes.length || viewport.scale <= 0) return slots;
  const {width,height,planeWidth,planeHeight,scale} = viewport;
  const planeLeft = (width - planeWidth * scale) / 2;
  const planeTop = (height - planeHeight * scale) / 2;
  const topSpace = 8;
  const bottomSpace = 28;
  const availableHeight = Math.max(0,height - topSpace - bottomSpace);
  const minimumGap = heroes.length > 1 ? Math.min(Math.max(16,30 * scale),availableHeight / (heroes.length - 1)) : 0;
  const columnX = planeLeft + (heroes[0].x + 12) * scale;
  const availableWidth = Math.max(0,2 * Math.min(columnX - width / 2 - 8,width - 8 - columnX));
  const queueRatio = focused && focused.size > 0 ? heroes[0].size / focused.size : 1;
  let linkedSizeLimit = Infinity;
  if (focused) {
    const focusedX = planeLeft + (focused.x + 12) * scale;
    // Grow the focused hero with the queue to preserve its larger size,
    // but keep both cards within the right half and separated horizontally.
    const focusedLimit = Math.max(0,Math.min(
      height - 64,
      2 * (focusedX - width / 2 - 8),
      2 * (width - 8 - focusedX),
      2 * (columnX - focusedX - 8) / (1 + queueRatio),
    ));
    linkedSizeLimit = focusedLimit * queueRatio;
  }
  const cardSize = Math.max(0,Math.min(
    heroes[0].size,
    availableWidth,
    linkedSizeLimit,
    (availableHeight - minimumGap * (heroes.length - 1)) / heroes.length,
  ));
  const gap = heroes.length > 1 ? (availableHeight - heroes.length * cardSize) / (heroes.length - 1) : 0;
  const rightShift = Math.min(36,Math.max(0,width - 8 - columnX - cardSize / 2));
  const positions = new Map(heroes.map((slot,index) => [slot.id,{
    ...slot,
    x:slot.x + rightShift / scale,
    size:cardSize / scale,
    y:((heroes.length === 1 ? topSpace + availableHeight / 2 : topSpace + cardSize / 2 + index * (cardSize + gap)) - planeTop) / scale - 32,
  }]));
  if (focused) positions.set(focused.id,{
    ...focused,
    size:cardSize / queueRatio / scale,
  });
  return slots.map(slot => slot.enemy ? slot : positions.get(slot.id)!);
}
