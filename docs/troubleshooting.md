# Troubleshooting

- **A client cannot find Ingenium:** check the client-specific location in [installation](install.md), preserve any existing copy and start a fresh conversation. Discovery depends on the client and its configuration.
- **The example reports renderer unavailable:** the SVG source is still editable. Follow the [optional renderer setup](../skills/ingenium/references/renderer-setup.md) and rerun into a new output directory.
- **The output directory already exists:** choose a new destination; generation does not overwrite an earlier result.
- **A font looks different:** examples use system sans-serif fonts; compare in the intended environment before delivery.
- **An export or preview failed:** retain the sources and any successful files, identify the failed stage, and retry the failed operation into a new destination.
- **A local edit must be retained during an update:** copy or commit your changes separately before replacing any installed skill. See [installation](install.md).

These steps do not establish that any specific client installation or update was tested.
