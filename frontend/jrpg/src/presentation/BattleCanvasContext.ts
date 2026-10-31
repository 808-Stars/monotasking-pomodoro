import { createContext } from "react";

/** The active scene owns its overlay plane; battle consumers reuse this context. */
export const BattleCanvasContext=createContext<{
  element:HTMLElement|null;rotation:number;scale:number;
}|null>(null);
