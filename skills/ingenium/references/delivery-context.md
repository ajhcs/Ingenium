# Media and delivery context

Use the relevant parts when the work includes asynchronous media generation, format conversion or motion output. Reuse existing acquisition and export routes; this reference adds no provider or runtime.

## What the person will look for

- The delivered file looks right in the viewer it's meant for, not just in a source preview.
- Variants keep the subject details that had to stay fixed, such as identifying marks or proportions.
- Motion reads well at intended speed, with enough time to read after each reveal.
- Failures are located precisely and reported honestly, without a later success standing in for an earlier failure.

## Media jobs

For an already authorized job, keep its actual job, status and output identifiers, and use supported result retrieval before submitting duplicate work. Tie each required output to its purpose. Submission, successful transport and a nonempty file are each different from a completed, suitable asset. Keep unresolved outputs and distinguish an acquisition failure from a content mismatch.

## Conversions

After converting, open the delivered file in the intended viewer when available. Compare meaningful content and structure with the source: relevant text runs, emphasis, actual fonts or fallback, placement and cropping. Valid geometry doesn't establish destination rendering. Say which target format and viewer you inspected and which remain untested.

## Motion

Separate the input that drives change, the way time advances and the delivered representation. A gesture may scrub time or select a segment that then plays; the video format doesn't decide that. Keep the task's state meanings and input dimensions when choosing media. Watch playback at intended speed as well as selected frames, checking continuity and reading time after reveals. Exercise seeking or replay when the deliverable depends on them. Bind observations to the output revision and playback context, with timestamps or an actual seed when that helps reproduce a defect. [Connected sketches](interaction-sketches.md) cover interruption of consequential interactions.

## When an export fails

If an export is empty, missing or unusable, find the stage that failed: rendering or capture, payload creation, saving, or opening the result. Check the payload type and bytes before blaming a destination path. Use supported host operations, keep valid source work, and report any stage whose outcome is still unknown.

## Done when

Each output you list has been opened in its intended viewer (or is marked untested there), motion has been watched at speed, and every failed stage is reported as failed.

Source lineage: original synthesis informed by Open Design's [media job guidance](https://github.com/nexu-io/open-design/blob/8d820a698908dc279ef3d5aeb4ce6d156211a499/skills/od-next-media-inputs/SKILL.md), [export diagnosis](https://github.com/nexu-io/open-design/blob/8d820a698908dc279ef3d5aeb4ce6d156211a499/skills/export-download-debugging/SKILL.md), [conversion fidelity](https://github.com/nexu-io/open-design/blob/8d820a698908dc279ef3d5aeb4ce6d156211a499/skills/pptx-html-fidelity-audit/SKILL.md), [motion review](https://github.com/nexu-io/open-design/blob/8d820a698908dc279ef3d5aeb4ce6d156211a499/skills/motion-design/SKILL.md) and [time/input separation](https://github.com/nexu-io/open-design/blob/8d820a698908dc279ef3d5aeb4ce6d156211a499/skills/oil-motion/references/runtime.md). No upstream renderer, code or media is included.
