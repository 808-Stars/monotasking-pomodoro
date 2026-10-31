export function isConfirmKey(key:string):boolean { return key==="Enter"||key===" "||key==="Spacebar"; }

/** Text editing keeps Backspace/Space; shortcuts must not erase or submit input. */
export function isEditingTarget(target:EventTarget|null):boolean {
  return typeof Element!=="undefined"&&target instanceof Element
    &&!!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]');
}
