# Universe Future Work Notes

## Playability Review Notes

### Good current baseline
- The fighter is a solid playable baseline: responsive, readable, and immediately usable.
- Core controls now behave coherently: pitch, roll, thrust, firing, and rigid camera follow all feel aligned with the ship transform.
- The 4-gun fighter produces clear, immediate weapon feedback.

### High-priority future work

#### 1. Capital-ship flight model is likely too sluggish
Current large-hull movement scaling drops off very hard because translational responsiveness is effectively derived from `maxSpeed / mass`.

Observed progression:
- shuttle: very agile
- fighter: agile and fun
- corvette: noticeable drop
- destroyer/cruiser/battlecruiser: likely too sluggish to feel good without a very deliberate capital-ship fantasy and supporting systems

Implication:
- Consider introducing an explicit thrust / acceleration stat instead of deriving responsiveness only from `maxSpeed / mass`.
- Keep `maxSpeed`, `turnRate`, and acceleration as separately tunable knobs.

#### 2. Large-ship weapon fantasy is not yet expressed
Hardpoint local orientation is now supported in code, but all current hull definitions still use zero orientation.

Implication:
- Port/starboard batteries do not yet feel like broadside weapons.
- Larger ships still behave like "many forward guns" instead of ships with directional batteries.

Future work:
- Give side-mounted hardpoints explicit yaw offsets.
- Later, add turreted mounts where appropriate.

#### 3. Need a hull/dev selector for comparative playtesting
Only the fighter is meaningfully playtestable in the current boot flow.

Future work:
- Add a development hull selector or spawn switcher.
- Make it easy to swap between shuttle, fighter, corvette, destroyer, cruiser, and battlecruiser in-game.
- Use that to tune mass, speed, turn rate, weapon count, and acceleration against each other.

### Weapon balance notes

#### 4. Large hulls will strongly dominate raw mounted DPS
With all-light-cannon assumptions, larger hulls scale to much higher total damage output simply through hardpoint count.

Implication:
- This may be fine, but only if offset by mobility, target profile, survivability, range envelopes, firing arcs, and future systems like shields/armor.

#### 5. Heavy cannon role is coherent but subtle
Heavy kinetic cannons currently read as:
- better alpha damage
- slower projectile
- longer range
- only slightly better sustained DPS

Implication:
- This is coherent, but the gameplay distinction may need to be exaggerated later if weapon roles feel too similar.

### Recommended next design tasks
1. Add a target dummy and proper weapon-hit feedback loop.
2. Add a hull selector for comparative tuning.
3. Angle side hardpoints on larger hulls.
4. Rebalance capital-ship acceleration with an explicit thrust model.
5. Revisit weapon role differentiation after targets and damage feedback exist.
