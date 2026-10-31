// Original fictional studies; the site builder stages existing selected artwork.
export const studies = {
  "peel": {
    "title": "Peel",
    "label": "Book cover · mixed media",
    "id": "peel-citrus-book",
    "description": "A citrus monograph with bold editable type and a separate textured illustration. Change the words, crop or artwork without flattening the whole cover.",
    "limit": "The illustration is raster artwork; layout and text remain editable SVG. Print production is untested.",
    "prompt": "Use Ingenium to make a cover for a fictional citrus book called Peel. Show two different compositions with the same title. Keep typography editable and develop any illustration as a separate replaceable asset. Preview the result at cover size."
  },
  "alt": {
    "title": "ALT",
    "label": "Identity · four-page manual",
    "id": "alt-identity-standards",
    "description": "An identity for the fictional Atmospheric Listening Trust, developed through marks, type, color and applications. Inspect the pieces and the assembled manual.",
    "limit": "A fictional visual identity. Novelty and production suitability remain untested.",
    "prompt": "Use Ingenium to explore an identity for a fictional Atmospheric Listening Trust. Compare two organizing ideas, then develop a mark, typography and a short identity manual. Keep the components and pages independently editable."
  },
  "form": {
    "title": "FORM 08",
    "label": "Editorial · layered cover",
    "id": "form-listening-issue",
    "description": "A magazine issue about listening in public. A replaceable editorial portrait sits within a layout of editable typography and supporting details.",
    "limit": "The generated portrait is a raster layer, not editable vector geometry. Editorial content is fictional.",
    "prompt": "Use Ingenium to develop a fictional magazine cover about listening in public. First compare the hierarchy using neutral composition studies. Develop a separate portrait asset if useful, and assemble it with editable type. Preserve earlier studies."
  },
  "open-air": {
    "title": "Open Air",
    "label": "Event poster · illustration and type",
    "id": "open-air-field-notes",
    "description": "A garden-music poster with painted swallows and live typography. Follow the ingredients, neutral composition, asset development and final assembly.",
    "limit": "The painted artwork is a separate raster asset. Event details are fictional; print production is untested.",
    "prompt": "Use Ingenium to make a poster for a fictional garden music event called Open Air. Compare two hierarchies with the same event details. Keep painted bird imagery separate from the editable title, date and invitation."
  },
  "aster": {
    "title": "ASTER",
    "label": "Object study · exploded composition",
    "id": "aster-sensor-study",
    "description": "A fictional sensor enclosure presented through an exploded assembly and component index. The sources expose the visual components and their arrangement.",
    "limit": "A visual concept, not an engineered product or a verified assembly.",
    "prompt": "Use Ingenium to explore a fictional sensor enclosure as a visual concept. Show components separately, compare two exploded-view compositions, and keep labels and visual elements editable. Identify assumed geometry and untested mechanical relationships."
  },
  "fieldwork": {
    "title": "Fieldwork",
    "label": "Interactive website · retained V2 study",
    "image": "assets/demos/fieldwork-desktop.png",
    "source": "examples/release/fieldwork/index.html",
    "description": "A responsive public-space collective website. Open its project dialogs, explore the pattern control, and inspect the HTML, CSS and JavaScript.",
    "limit": "A retained fictional website study. Selected interactions were reviewed; broader audience and browser qualification remain open.",
    "prompt": "Use Ingenium to develop a website for a fictional public-space collective. Define project browsing and dialog behavior before polishing. Build responsive HTML, CSS and JavaScript with editable artwork, then exercise keyboard navigation and dialog recovery."
  }
};
for (const study of Object.values(studies)) if (study.id) {
  study.image = 'assets/process/' + study.id + '-final.jpg';
  study.processImage = 'assets/process/' + study.id + '-stages.jpg';
  study.source = 'examples/process/' + study.id + '/source/final-01.svg';
  study.case = 'examples/process/' + study.id + '/README.md';
}
