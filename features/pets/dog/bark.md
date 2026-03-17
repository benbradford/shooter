For the dog's special ability, i want him to walk towards the nearest enemy and bark. there are bark animations in the sprite sheet. if there is no enemy within 400px of the dog, then the interaction icon shouldn't be visible. For the hud icon, can we use public/assets/pets/dog/dog/bark_icon.png. when the dog barks, any enemies within 600px of the dog are affected and go into a fear state. (Note that bugbase isn't affected by this, but other moving enemies are, such as bugs, skeletons, pumas, throwers, robots, bulletDude). When in a fear state, the enemeies move away from the enemy for 4 seconds. for the icon above the enemy heads, use public/assets/pets/dog/dog/fear_icon.png.


Create a **Fear Status Visual System**

The system is triggered when the player’s **dog pet uses a bark ability**, causing nearby enemies to become frightened and flee for a short duration.

The goal is to provide **clear, immediate visual feedback** that enemies are in a “fear” state, without modifying existing character sprites.

---

CORE REQUIREMENTS

• Do not modify enemy sprites
• Use only overlays, particles, UI elements, and transform effects
• All effects must be readable at small scale
• Effects must not obscure gameplay or player visibility
• Effects must clearly communicate: “enemy is frightened and fleeing”

---

1. FEAR ICON (PRIMARY INDICATOR)

Display an icon above each frightened enemy.

Icon design:

• jagged “shock” symbol (spiky burst shape)
• color: pale yellow or off-white
• simple silhouette, readable at small size
• no outline clutter

Behavior:

• appears instantly when fear is applied
• scale animation: 0 → 120% → 100% over 0.2 seconds
• subtle jitter/shake while active
• fades out when fear ends

Position:

• anchored above enemy head
• does not overlap enemy sprite

---

2. BARK ACTIVATION EFFECT (SOURCE FEEDBACK)

When the dog ability is triggered:

Create a radial “sound wave” effect centered on the player.

Properties:

• expanding circular ring
• soft white/grey color
• slight transparency
• expands quickly then fades out

Optional:

• very subtle screen shake (low intensity, short duration)

Purpose:

• visually connects player action to enemy reaction

---

3. ENEMY MOTION MODIFIERS (NO SPRITE CHANGES)

When enemies are frightened:

• immediately turn away from player
• increase movement speed slightly
• add small random zig-zag movement while fleeing

Optional transform effects:

• slight position jitter (very subtle)
• slight directional stretch (scale slightly along movement axis)

---

4. PARTICLE EFFECTS (SECONDARY FEEDBACK)

Attach lightweight particle effects to frightened enemies.

Use one or both:

A) Dust particles
• small puffs behind enemy while moving
• low opacity
• short lifetime

B) Sweat particles
• small blue droplets emitted intermittently
• rise slightly then fade

Keep particle count low to avoid clutter.

---

5. COLOR / FLASH FEEDBACK

On fear application (initial bark hit):

• apply a brief white flash overlay on enemy (0.1–0.2s)

Optional during fear:

• very subtle desaturation or pale tint overlay
• must not obscure sprite detail

Avoid:

• strong red (reads as damage)
• green (reads as poison/healing)

---

6. DURATION HANDLING

Fear state visuals must:

• start instantly on effect application
• persist clearly during duration
• cleanly fade out when effect ends

No abrupt popping off.

---

7. PERFORMANCE CONSTRAINTS

• limit particle count per enemy
• reuse particle systems where possible
• avoid expensive shaders
• ensure system scales with multiple enemies active

---

8. PRIORITY ORDER (MOST IMPORTANT → LEAST)

9. enemy movement (fleeing behavior)

10. fear icon

11. bark wave effect

12. particles

13. subtle transforms

If performance is limited, keep higher priority elements.

---

9. VISUAL CLARITY RULE

At any moment, the player must be able to instantly tell:

• which enemies are affect
