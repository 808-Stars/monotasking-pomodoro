export interface BattleFocus {
  rootActorId: string | null;
  reactionActorId: string | null;
}

export type BattleFocusEvent =
  | { type: "begin"; actorId: string | null }
  | { type: "reaction"; actorId: string }
  | { type: "return" }
  | { type: "complete" };

/** A display focus is not an engine turn, selected target or input permission. */
export function reduceBattleFocus(focus: BattleFocus, event: BattleFocusEvent): BattleFocus {
  switch (event.type) {
    case "begin":
      return { rootActorId: event.actorId, reactionActorId: null };
    case "reaction":
      return { ...focus, reactionActorId: event.actorId };
    case "return":
      return { ...focus, reactionActorId: null };
    case "complete":
      return { rootActorId: null, reactionActorId: null };
  }
}
