# Third party notices

Ingenium's original code and synthetic examples use the project MIT license. No source from a private reading, annotation, course document or user record is included.

The optional [Sharp](https://github.com/lovell/sharp) renderer is used unmodified under Apache-2.0. It and its binary dependencies are installed separately through npm, with their distributed LICENSE, NOTICE and third-party copyright files. The optional libvips binary packages declare LGPL-3.0-or-later and include notices for their bundled libraries. Preserve those files and applicable redistribution terms when redistributing an installed dependency tree; the project MIT license does not replace them. This repository does not vendor those components or font files. THIRD_PARTY.json identifies the direct component and the package lock pins the resolved checkout dependency closure.

OpenAI's official [plugin packaging](https://developers.openai.com/plugins/build/plugins) and [skill authoring](https://developers.openai.com/plugins/build/skills) documentation informed the package layout. No third-party endorsement is claimed.

The optional browser adapter uses separately installed [Playwright](https://github.com/microsoft/playwright) under Apache-2.0 and [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm), with axe-core, under MPL-2.0. They are loaded unmodified only on explicit use and are not vendored or installed on import. Preserve their own notices when redistributing installed dependencies. Browser binaries and runtime libraries are supplied separately and retain their respective licenses. No font or browser binary is distributed here.
