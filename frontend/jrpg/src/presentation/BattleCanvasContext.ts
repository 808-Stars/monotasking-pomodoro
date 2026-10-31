import { createContext } from "react";

/** Each mounted battle owns its overlays; never query another battle's canvas. */
export const BattleCanvasContext=createContext<{
  element:HTMLElement|null;rotation:number;scale:number;
}|null>(null);
