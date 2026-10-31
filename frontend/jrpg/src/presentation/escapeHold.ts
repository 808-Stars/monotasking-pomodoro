/** Distinguish a short press from holding Escape to leave webpage fullscreen. */
export function createEscapeHold(onTap:()=>void,onHold:()=>void,delay=800) {
  let pressed=false;
  let held=false;
  let timer:ReturnType<typeof setTimeout>|undefined;
  function cancel(){
    clearTimeout(timer);timer=undefined;pressed=false;held=false;
  }
  return {
    down(){
      if(pressed)return;
      pressed=true;held=false;
      timer=setTimeout(()=>{timer=undefined;held=true;onHold();},delay);
    },
    up(){
      if(!pressed)return;
      const tap=!held;cancel();
      if(tap)onTap();
    },
    cancel,
  };
}
