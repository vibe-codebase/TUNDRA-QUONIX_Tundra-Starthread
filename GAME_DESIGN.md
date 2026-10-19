# Tundra Starthread: design notes

**Pillars.** One gesture and one rule, the old puzzle of drawing a figure without lifting the pen (Euler, 1736), set in a sky worth looking at. It should be calm and never punishing: undo is free, and the only score is whether the thread got stuck.

**Rule.** A chart is a multigraph of stars and lines. A line is traced `times` times (1, or 2 for a double line). A comet line can only be traced in its direction. The thread is a walk that uses every line its number of times.

**Readability.**
- Untraced lines are fine dotted silver. Double lines are two parallel strands, and comet lines carry gold chevrons.
- Lit lines glow white-gold, with a soft halo.
- The thread's head is a pulsing ring. While the finger is lifted, faint rings mark every star the thread can reach next.
- When the thread is stuck it flickers red, the undo button pulses and a toast says what happened.

**Input.**
- Touch a star to begin. Touching another star before any line is drawn changes the start.
- Dragging snaps to a star within reach when a traceable line leads there; tapping a reachable star also works.
- Snap radius is at least 24 world units (about 7.5% of the chart).

**Generation (`tools/gen.ts`).**
- Stars are scattered with minimum spacing.
- Candidate lines join near neighbours, greedily from shortest, and are rejected if they cross another, pass within 0.075 of a star, or meet another line at less than 0.5 rad.
- A random walk over the candidates (fresh lines preferred, a line used twice where doubles are allowed) becomes the chart, so a solution always exists. Some single lines become comets in the walk's direction.
- The chart is rescaled to fill the box. Its trickiness is the fraction of 600 random-choice threads, begun at a valid start, that get stuck. Each template asks for a trickiness range, and charts are sorted by it within each chapter.

**Stars.** 3 if never stuck and no hint; 2 if stuck once or twice, or a hint was used; otherwise 1.

**Accessibility.** Reduced motion turns off twinkling and line-draw animation. Every control has a 46 px+ target and an aria label. It plays fully offline.
