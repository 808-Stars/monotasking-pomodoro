import type { Resource } from "../game/economy.ts";
import type { CSSProperties } from "react";
import { dungeons, finalEncounter } from "../game/dungeons.ts";
import { bossAppearance } from "../presentation/enemyArt.ts";

// Shared by the map's preparation page and its save-free visual check.
export default function DungeonArt({
  resource,
}: {
  resource: Resource | "final";
}) {
  const appearance = bossAppearance(resource);
  const dungeon = resource === "final" ? finalEncounter(1) : dungeons[resource];
  return (
    <div
      className="dungeon-art"
      data-resource={resource}
      aria-label={`${dungeon.name}场景与敌人预览`}
    >
      <div
        className="dungeon-preview-stage"
        style={
          {
            backgroundImage: `url("${appearance.preparationPreview}")`,
            "--warden-art-scale": appearance.stage.scale,
            "--warden-depth-offset": `${appearance.stage.depthOffset}%`,
          } as CSSProperties
        }
      >
      </div>
      <span>
        {dungeon.boss} · {dungeon.name}
      </span>
    </div>
  );
}
