# Behavioral review

A separate model evaluator inspected the Chromium renders, editable sources, and handoffs in masked packets. It viewed each render before reading the handoff. Version labels were restored after it returned its answers. The answers below are the evaluator’s observations. The underlying run receipts retain the evidence paths and review state.

All runs used Codex CLI 0.169.0 with requested model `gpt-6.2-astra` and low reasoning effort. The baseline was `afeb130`. Each version has a distinct `SKILL.md` hash.

| Guidance | SHA-256 of `SKILL.md` |
| --- | --- |
| Baseline | `47912672eb53290d677ac565b1ce2a786305963542f9820435478510e6dab5b2` |
| First revision | `d0596a7d2f52cc0f93e615d76decda813a5d86cff2de5f4c66df849248b69e68` |
| Follow-up revision | `0f26ab1d8d7753d2972689ecc80b02050dff2e09bb370d6f21c29b08a4699306` |

## Initial named-skill runs

Five briefs ran once per guidance version with the same explicit skill cue.

### Delegated Oriole Cinema commission

**What did you notice first in the artifact before reading its handoff?**

- **Baseline.** The oversized two-line “One film, two scores.” headline. The red strokes and matching red 20:00 pulled my eye after the headline.
- **First revision.** The oversized “One silent short. Two scores.” headline caught my eye first, followed by the orange pencils at the right of the horizontal graphic.

**Which visible choice depends on this film being shown twice with different performers? What would need to change for a single screening?**

- **Baseline.** The explicit “same silent short” subtitle, black piano keys beside red freehand-like strokes, and matched rows set up two ways to score one film. A single showing would need a singular headline and footer, one time row, and a graphic keyed to the remaining performer.
- **First revision.** The piano keys extend into a same-width run of pencil shapes, aligned with the pianist and audience columns below. For a single screening, the headline and admission copy would need singular wording, with one time and the graphic corresponding to its performer.

**Can you find the show you want to attend at lobby reading size? Where does the expressive choice help or get in the way?**

- **Baseline.** Yes in the captured A3 layout. A rule separates two time rows, each with its description immediately to the right. The red 20:00 links to the red marks and gives the audience session more visual pull. The marks do not identify paper and pencils as directly as the copy does. Viewing distance was untested.
- **First revision.** Yes in the A3-proportioned render. Bold, equally prominent 19:00 and 20:00 lead their own columns, and the graphic reinforces the matching roles. The headline and illustration push the schedule into the lower portion, so visitors drawn in by the artwork still need to look down for the times. Physical lobby-distance legibility was untested.

**Does the handoff explicitly name a consequential cost or compromise of the chosen direction?**

- **Baseline.** The handoff describes “A piano keyboard gives way to red pencil strokes, linking the 19:00 pianist screening to the 20:00 audience-made score.” Its remaining statements concern editability and checking the render. It expresses no cost or compromise.
- **First revision.** The handoff says the piano keys “turn into pencils above 20:00, so visitors can see at a glance who makes the music each time.” It reports fit, legibility, and editability. It gives a rationale and identifies no cost or compromise.

### Collaborative Oriole Cinema studies

**Do the studies differ in an organizing idea useful for this brief?**

- **Baseline.** Yes. Double Bill aligns 19:00 and 20:00 at equal size in two rows, so the viewer can compare who scores the same short. Your Turn makes 20:00 and “you make the score” the main invitation, adds pencil marks, and moves 19:00 to a lower paragraph. The latter headline crowds the right edge at 400 px.
- **First revision.** Yes. Double Bill uses equal filmstrip frames to present the two showings as parallel options. Your Score leads with the audience’s 20:00 role and uses the red underline as a cue, with 19:00 set smaller below. Both preserve the event facts and make the priority difference visible.

**Does the response invite a concrete comparison without committing the choice?**

- **Baseline.** Yes. The handoff asks what a visitor at the lobby doorway should notice first, the choice of two screenings or the chance to make a score. It supplies both editable studies and previews without selecting one.
- **First revision.** Yes. The handoff asks whether the first thought should be “I could see both” or “I could play along,” corresponding to the two visible hierarchies. It presents an editable source and raster preview for each and leaves the choice with the reader.

### Ambiguous feedback on Field Station

**Does the probe isolate a consequential interpretation?**

- **Baseline.** Yes. It confines “too corporate” to the heading’s typography, letting a viewer test whether a monospaced heading feels like a field note or a form with no other source changes. The unchanged data and status remain readable. Appearance is evidenced by the study’s Chromium image and may vary with the monospace face selected by a viewer.
- **First revision.** Yes, within the heading. The monospaced face visibly shifts that line toward typed field notes while the rest of the card stays fixed. The handoff tests the alternative reading that this could feel more technical and leaves the direction open. The packet contains only a study render, so the original is available for comparison as an SVG.

### Protected Field Station title edit

**Were any unrequested changes introduced?**

- **Baseline.** No. The revised source equals the included input with only the exact title text replaced. The note identifies the editable revision and the scope preserved, and the Chromium view shows the new title fitting above the existing card content.
- **First revision.** No. A byte comparison confirms that “Field Station readiness review” replaces only the title in the supplied SVG. That preserves the rest of the text, units, geometry, colors and IDs. The continuation note records the same scope and the render shows the new title without clipping.

### Ordinary Field Station overview

**Did the assistant choose routine presentation details and deliver the overview without reframing it as a creative commission or approval exercise?**

- **Baseline.** Yes. It chose a clear visual hierarchy with plain boxes, two rightward arrows, and a distinct Controller fill. The delivered SVG visibly retains the exact wording and chain. The handoff provides a direct link and asks for no new decision.
- **First revision.** Yes. It delivered one editable SVG with ordinary type, shape, and emphasis choices. The render shows “Field Station,” “18 April 2030,” “Review the revised system.” and Sensor → Controller → Display. The handoff links the artifact directly and adds no approval step.

## Follow-up runs

The ordinary overview and delegated cinema commission ran uncued against the baseline and follow-up guidance. All four session logs show a successful read of the project-local `SKILL.md`. The follow-up guidance also ran the cinema commission once with the skill explicitly named.

### Delegated Oriole Cinema commission

**What did you notice first in the artifact before reading its handoff?**

- **Baseline, uncued.** The big “One silent short.” and italic “Two scores.” headline registered first. Then I noticed how the top edge of the keyboard continues across the orange pencils.
- **Follow-up revision, uncued.** The very large, bold “Two scores.” caught my eye first. The next thing I saw was the orange row of sharpened pencils directly below the black-and-white keyboard.
- **Follow-up revision, named.** The oversized “One silent short, scored twice.” headline came first. Then the warm orange sharpened pencils stood out against the black keyboard and cream background.

**Which visible choice depends on this film being shown twice with different performers? What would need to change for a single screening?**

- **Baseline, uncued.** The shared edge and repeating vertical shapes make piano keys and sharpened pencils two halves of the same illustration. The numbered rows reveal their two performers. A one-screening poster would need one row, the relevant half of the illustration, and singular headline and footer wording.
- **Follow-up revision, uncued.** The same-width strips stack a regular keyboard and an irregular row of pencils between the two listings, with each material next to the time it describes. A single screening would leave one time and its associated strip, with singular copy in the title and admission line.
- **Follow-up revision, named.** The keyboard and pencil row sit over parallel 19:00 and 20:00 columns, so the viewer can match each way of making the score to the same short. One screening would use one artwork and time column, and replace “scored twice” and “both screenings” with singular wording.

**Can you find the show you want to attend at lobby reading size? Where does the expressive choice help or get in the way?**

- **Baseline, uncued.** Yes in the captured A3 layout. The rules and aligned times make the rows easy to scan, and each description follows its time horizontally. The artwork makes the instruments recognizable, but its left-right split does not directly line up with the stacked listings. The labels do the exact time-to-performer work. Physical viewing distance was untested.
- **Follow-up revision, uncued.** Yes in the A3-proportioned image. Both times are large and bold, and each description sits directly beside its time. The strips give each performer a recognizable cue, although their height forces a longer vertical scan to compare 19:00 with 20:00. Free admission remains visible in the footer. The render does not establish a physical reading distance.
- **Follow-up revision, named.** Yes in the A3 render. Large, level times sit immediately under their pictures, with performer text aligned to each time. That makes it easy to find either event. The illustration occupies much of the center, with smaller practical information below, and the paper-and-pencil line wraps to a third line. Lobby-distance and print legibility were untested.

**Does the handoff explicitly name a consequential cost or compromise of the chosen direction?**

- **Baseline, uncued.** The handoff describes that “Piano keys turn into sharpened pencils above the two screening times.” It describes the visual idea, editability and a local renderer failure. It states no design cost or compromise. The renderer failure is a verification limitation.
- **Follow-up revision, uncued.** The handoff says “From across the lobby, the image signals the change in who makes the music” and immediately adds “The free-admission line sits at the foot of the poster and reads best up close.” This states a consequential visibility cost for the admission message alongside the distance benefit of the image, without expressly attributing that cost to the image taking up the space.
- **Follow-up revision, named.** After describing how the artwork connects the two screenings, the handoff states “The illustration takes the most space, so the free-admission line reads best up close.” It explicitly links giving space to the image with a reduced distance at which admission can readily be read.

### Ordinary Field Station overview

**Did the assistant choose routine presentation details and deliver the overview without reframing it as a creative commission or approval exercise?**

- **Baseline, uncued.** Yes. The overview uses straightforward layout choices, with three identically styled boxes and two right-pointing arrows. It contains the exact title, date and review invitation, and the handoff delivers the editable SVG directly without requesting a design or approval decision.
- **Follow-up revision, uncued.** Yes. It settles routine hierarchy through a bold heading and a dark center box, keeps Sensor → Controller → Display clearly directed, and displays the exact date and invitation. The handoff supplies one editable SVG and adds no approval exercise.

Each result is one observed run of that brief, guidance version, and cue setting. The record supports a narrow comparison of the tested outputs and observed skill reads.
