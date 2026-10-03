# Art pack 1 — the town from above

For ChatGPT image generation. Everything in this pack is seen **straight down from directly overhead**, like a
satellite photo or a top-down video game. That is the one thing image models get wrong most often (they add a tilt
or a horizon), so every prompt repeats it.

## How to run this pack

1. Open **one new chat** for the whole pack, so the style stays consistent.
2. Paste the **style block** below first, on its own, and send it. ChatGPT will reply with a short acknowledgement or
   ask to start; that's fine.
3. Generate the **style reference** (prompt 0). If you don't like it, ask for changes until you do — every other image
   is matched to it, so it's worth getting right.
4. Then send the prompts one at a time, in order. After each image, if it has any tilt, perspective, a ground shadow,
   text or a background, reply: *"Redo it: perfectly top-down, transparent background, no shadow, no text."*
5. Download each image as PNG and name it **exactly** as given (the game looks for these names).
6. Put the files in the repo under **`assets/img/`** on the `qa-pass2-fixes` branch (on GitHub: open the branch,
   *Add file → Upload files*, type `assets/img/` in front of the names). Or upload them wherever is easiest and tell me.

You don't need to resize or crop anything: the game trims the empty edges and scales each image to the right size.
Any image you don't supply keeps its current drawn version, so you can do them in any order and a few at a time.

---

## Style block (send first)

> I'm making art for a 2D top-down courier-training video game. Every image I ask for in this chat must follow these
> rules exactly:
>
> - **Camera:** perfectly top-down orthographic view, looking straight down from directly above. No perspective, no
>   tilt, no horizon, no side of the object visible. Like a satellite photo or a classic top-down driving game.
> - **Style:** clean modern illustrated game art, like a polished mobile game. Smooth shapes, soft gradients, crisp
>   edges, subtle highlights, limited texture. Not cartoonish or chunky, not photographic.
> - **Lighting:** soft daylight from the top-left of the image, the same in every image.
> - **Background:** fully transparent PNG. One object only, centered, filling most of the frame. Nothing around it:
>   no ground, no road, no grass, no cast shadow on the ground (the game adds shadows itself).
> - **No text, letters, numbers, logos or brand names anywhere.**
> - Colors: natural and slightly muted, so they sit well on grey roads and green lawns.
>
> Reply "ready" and I'll send the first image.

## 0. Style reference — `van_top.png`

> First image: a white delivery step van (a boxy walk-in delivery truck about 6.7 m long and 2.6 m wide), seen
> perfectly from above, front of the van pointing to the TOP of the image. Flat white box roof with a few subtle roof
> seams and a small roof vent, a short sloped cab section at the front with a wide dark windshield, two side mirrors
> sticking out at the front corners, small amber/white headlight hints at the front edge and red tail-light hints at
> the rear edge. A purple stripe and a thin orange stripe running along the length of the roof, slightly right of
> center. Portrait image, transparent background, no shadow, no text.

## 0b. The same van, closer to realistic — `van_top_real.png`

> Now the exact same van, same top-down view and orientation, but rendered **closer to realistic**: believable
> painted-metal and glass materials, fine panel lines, slight weathering and road dust, realistic reflections on the
> windshield. Keep the purple and orange roof stripes. Still transparent background, no shadow, no text.

*(We'll drop both into the game and compare side by side before deciding the style for everything else. If you choose
realistic, I'll give you the realistic version of the style block.)*

## Traffic cars — `car_top_red.png`, `car_top_blue.png`, `car_top_white.png`, `car_top_green.png`, `car_top_black.png`, `car_top_amber.png`

Send these one at a time, changing the color and body style each time:

> A [COLOR] [BODY STYLE] car seen perfectly from above, front pointing to the TOP of the image, in the same style as
> the van. Visible from above: the painted roof and hood, the windshield and rear window as dark glass, the side
> windows as thin dark strips, the side mirrors, headlights at the top edge and tail lights at the bottom edge.
> About 2 m wide and 4.7 m long. Portrait image, transparent background, no shadow, no text.

| File | [COLOR] | [BODY STYLE] |
| --- | --- | --- |
| `car_top_red.png` | deep cherry red | compact sedan |
| `car_top_blue.png` | sky blue | hatchback |
| `car_top_white.png` | pearl white | mid-size SUV |
| `car_top_green.png` | teal green | station wagon |
| `car_top_black.png` | charcoal black | sedan |
| `car_top_amber.png` | warm amber yellow | small crossover |

## Ambulance — `ambulance_top.png`

> An ambulance (a boxy white emergency van, slightly larger than a car) seen perfectly from above, front to the TOP.
> White body with a red stripe along each side of the roof, a light bar across the front of the roof (red and blue
> lenses, unlit), dark windshield. Same style. Transparent background, no shadow, no text or symbols.

## School bus — `bus_top.png`

One image: the game draws the stop arm and the flashing lights over it when the bus stops for children.

> Next: a **yellow American school bus** seen perfectly from above, front pointing to the TOP of the image, in the
> same realistic style. Long and narrow, about 2.5 m wide and 11 m long. Yellow roof with two or three white
> emergency roof hatches down the middle, thin black stripes along both roof edges, a short sloped hood at the very
> front with a dark windshield behind it, and two side mirrors kept close to the body at the front corners. Stop arm
> folded flat against the side (not visible). Very tall portrait image, transparent background, no shadow, no text.

## House roofs — `td_house_0.png` … `td_house_3.png`

Only the roof: these will sit on top of walls the game draws, so no walls, no yard, no ground.

> The roof of a single-family house seen perfectly from above, filling the whole image edge to edge with no ground
> around it. [ROOF]. Same style, same top-left light so the roof planes facing up-left are lighter. Landscape image,
> transparent background, no shadow, no text.

| File | [ROOF] | Shape |
| --- | --- | --- |
| `td_house_0.png` | a simple gable roof with dark charcoal asphalt shingles and a brick chimney | about 1.25 : 1 wide |
| `td_house_1.png` | a hip roof with warm terracotta clay tiles | about 1.4 : 1 wide |
| `td_house_2.png` | an L-shaped gable roof with slate-blue shingles and a skylight | almost square |
| `td_house_3.png` | a gable roof with weathered brown shingles, a small dormer and a chimney | about 1.3 : 1 wide |

## Business roofs — `td_biz_0.png`, `td_biz_1.png`

> The flat roof of a small single-story commercial building seen perfectly from above, filling the image edge to edge,
> no ground around it. Light grey membrane roof with a raised parapet edge, [DETAILS]. Same style. Transparent
> background, no shadow, no text.

| File | [DETAILS] | Shape |
| --- | --- | --- |
| `td_biz_0.png` | three grey HVAC units, a roof hatch and drainage lines | about 1.45 : 1 wide |
| `td_biz_1.png` | two large HVAC units, a row of skylights and a vent stack | almost square (1.05 : 1) |

## Apartment roof — `td_apt.png`

> The flat roof of a three-story apartment building seen perfectly from above, filling the image edge to edge. Warm
> brick-red parapet edge, light grey roof with four small rooftop units in a row, a stairwell bulkhead and some
> solar panels. Same style. Landscape about 1.7 : 1, transparent background, no shadow, no text.

## Delivery station roof — `td_depot.png`

> The flat roof of a large parcel delivery warehouse seen perfectly from above, filling the image edge to edge. Big
> light grey industrial roof with ribbed metal panels, rows of skylights, several large HVAC units, and along the TOP
> edge a plain solid purple band about one-sixth of the image height with a thin orange line under it (leave the band
> completely blank — the game writes the sign on it). Landscape about 1.75 : 1, transparent background, no shadow,
> no text.

## Trees — `td_tree_0.png`, `td_tree_1.png`, `td_tree_2.png`

> A [TREE] seen perfectly from above: a round leafy canopy, lit from the top-left so the upper-left of the canopy is
> brighter, with soft clumps of leaves and a slightly irregular edge. Same style. Square image, transparent background,
> no shadow on the ground, no trunk visible.

| File | [TREE] |
| --- | --- |
| `td_tree_0.png` | medium oak tree with deep green leaves |
| `td_tree_1.png` | large maple tree with bright green leaves |
| `td_tree_2.png` | small round ornamental tree with lighter yellow-green leaves |
