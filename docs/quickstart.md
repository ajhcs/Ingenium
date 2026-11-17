# Quickstart

Ask for an editable result in ordinary language. The guidance calls for a direct result with reasonable, reversible design choices.

> Create an editable engineering overview titled Field Station, dated 18 April 2030, with the invitation “Review the revised system.” Show Sensor → Controller → Display.

Then request a narrow revision:

> Change only the title treatment. Preserve the exact wording, date, invitation, component labels, and connection directions.

If you want Ingenium to choose the direction, add “You have the art direction.” If you want to make the choice together, try “Let's explore two directions before we choose.” [Art-direction guidance](../skills/ingenium/references/art-direction.md)

The [canonical fictional brief](../examples/evolution/brief.json) supplies the relationships. The [editable graphic](../examples/evolution/engineering-graphic/README.md), [technical document](../examples/evolution/document/README.md), and [small website](../examples/evolution/website/README.md) include opening and continuation notes. These are illustrative artifacts, not an accepted engineering model.

## Make the graphic locally

The editable source examples are separate from the small prepared core helper archive. With Node 22+ and the full example source plus its local helper dependencies, run from the source root:

```sh
node examples/engineering-quickstart/field-station.mjs /path/to/new-output-directory
```

The destination must not already exist. Open `revised.svg`; `original.svg` remains available for comparison. Text and vectors remain editable. The generator validates and revises an optional record, preserves the chosen relationship, and attempts a separate PNG only when the optional renderer is present. The returned status says when the PNG was not run. A standalone guidance skill does not include this generator or install the renderer. See [renderer setup](../skills/ingenium/references/renderer-setup.md) and [installation](install.md).

Continue by naming the requested change and what must stay fixed. A record or project store is optional; neither validation nor an export establishes taste, accessibility, engineering adequacy or acceptance.

To use the guidance without building or cloning a repository, follow [client installation](install.md). Optional prepared helper archives are described there; see [observed client compatibility](compatibility.md) for which routes were actually exercised.
