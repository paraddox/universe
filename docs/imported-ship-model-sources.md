# Imported Ship Model Sources

All imported ship models currently used by Universe are free and license-compatible for the project.

## Source platform
- Poly Pizza — https://poly.pizza/

## Current mappings

| Hull class | Local asset | Source | Author | License |
|---|---|---|---|---|
| shuttle | `public/assets/models/ships/shuttle-small-ship.glb` | https://poly.pizza/m/W2vMzztgIi | Quaternius | CC0 |
| fighter | `public/assets/models/ships/fighter-quaternius-a.glb` | https://poly.pizza/m/uCeLfsdmNP | Quaternius | CC0 |
| corvette | `public/assets/models/ships/corvette-quaternius-b.glb` | https://poly.pizza/m/xNbtFQwirO | Quaternius | CC0 |
| destroyer | `public/assets/models/ships/destroyer-quaternius-c.glb` | https://poly.pizza/m/htfBk9vPfw | Quaternius | CC0 |
| cruiser | `public/assets/models/ships/cruiser-quaternius-d.glb` | https://poly.pizza/m/PQzePrvBCD | Quaternius | CC0 |
| battlecruiser | `public/assets/models/ships/battlecruiser-quaternius-e.glb` | https://poly.pizza/m/Jqfed124pQ | Quaternius | CC0 |

## Player ship override

| Use | Local asset | Source | Author | License |
|---|---|---|---|---|
| player fighter override | `public/assets/models/ships/main-fighter.glb` | local user-provided asset | user-provided | pending confirmation |

## Notes
- Assets are loaded at runtime with `GLTFLoader`.
- Models are normalized automatically to each hull class length in `src/render/ShipModelManifest.ts`.
- No permanent external DCC or conversion tool installation was required for this import pass.
- For future optimization/compression work, `@gltf-transform/cli` and/or Blender would be useful.
