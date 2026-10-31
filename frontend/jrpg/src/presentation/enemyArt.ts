import type { Resource } from "../game/economy.ts";
import { poseSource } from "./motion.ts";

// Appearance is separate from the legacy guardian combat/save identity.
export function bossAppearance(resource: Resource | "final" = "coin") {
  const ids = {
    coin: {
      unitArtId: "guardian",
      portraitId: "gilded-warden",
      scene: "mint-vault",
    },
    exp: {
      unitArtId: "echo-archivist",
      portraitId: "echo-archivist",
      scene: "echo-library",
    },
    jp: {
      unitArtId: "trial-grandmaster",
      portraitId: "trial-grandmaster-bust",
      scene: "trial-corridor",
    },
    gem: {
      unitArtId: "prism-core",
      portraitId: "prism-core",
      scene: "prism-courtyard",
    },
    final: {
      unitArtId: "final-aberration",
      portraitId: "final-aberration-bust",
      scene: "final-court-grounded",
    },
  };
  return {
    ...ids[resource],
    preparationArt: poseSource(ids[resource].unitArtId, "idle"),
    // Accepted fused artwork is for preparation only. Combat keeps its enemy
    // and clean background separate so cards/opening never duplicate a boss.
    preparationPreview: `/jrpg/assets/scenes/enemy-previews-20261031/${ids[resource].portraitId.replace("-bust", "")}.webp`,
    background: `/jrpg/assets/scenes/dungeon-remake-20261018/${ids[resource].scene}.webp`,
    // One source for combat and map preparation framing. Percent offset is
    // measured against the ground plate; scale preserves the entire sprite.
    stage: {
      scale: resource === "coin" ? 1.2 : 1,
      depthOffset: resource === "coin" ? 3 : 0,
    },
    hue: 0,
    placeholder: false,
  };
}
