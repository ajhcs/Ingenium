#!/usr/bin/env node
import { readFile, realpath, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

export async function main(args, write = value => console.log(JSON.stringify(value, null, 2))) {
  const [command, ...rest] = args;
  const selector = values => values.length === 0 ? {} : values.length === 2 && ['--sharp-module', '--renderer-dir'].includes(values[0])
    ? { [values[0] === '--sharp-module' ? 'sharpModule' : 'rendererDir']: values[1] } : null;
  try {
    if(command==='resources'){
      const api=await import('../src/resources/index.mjs'),[operation,id,requestFile,...extra]=rest;
      if(operation==='discover'&&rest.length===1){write(await api.discoverResources());return 0;}
      if(['search','details'].includes(operation)&&id&&extra.length===0){const input=requestFile?JSON.parse(await readFile(requestFile,'utf8')):{};write(await api[operation==='search'?'searchResourceDirectory':'detailsResourceDirectory']({...input,id}));return 0;}
      throw new Error('Usage: ingenium resources discover | search|details PROVIDER_ID [REQUEST.json]; selected bundled packs: openResourceLibrary API');
    }
    if(command==='textures'){
      const api=await import('../src/textures/index.mjs');
      if(rest[0]==='discover'&&rest.length===1){write(api.discoverTextures());return 0;}
      if(rest[0]==='export'&&rest.length===3){const spec=JSON.parse(await readFile(rest[1],'utf8')),source={...api.createTexture({...spec.parameters,id:spec.id}),selected:true},texture=spec.customize?api.customizeTexture(source,spec.customize):source;write(await api.writeTexture({source,texture,outputDir:rest[2]}));return 0;}
      throw new Error('Usage: ingenium textures discover | export SPEC.json NEW_OUTPUT_DIR');
    }
    if (['catalog','svg-pack','font-pack','atomic','local-assets','font-download','brand-download'].includes(command)) {
      const [operation,configFile,...values]=rest;
      if(!configFile)throw new Error('Expected operation and CONFIG.json');
      const config=JSON.parse(await readFile(configFile,'utf8')),base=dirname(resolve(configFile));
      for(const key of ['manifestPath','packageDir','parserDir','iconUtilsDir'])if(config[key])config[key]=resolve(base,config[key]);
      for(const s of config.sources??[]){s.packageDir=resolve(base,s.packageDir);if(s.license?.path)s.license.path=resolve(base,s.license.path);}
      if(config.fluent)for(const key of ['packageDir','utilsDir','rightsEvidenceFile'])if(config.fluent[key])config.fluent[key]=resolve(base,config.fluent[key]);
      const factories={'brand-download':['../src/catalog/brand-download.mjs','createBrandDownloadClient'],'font-download':['../src/catalog/font-download.mjs','createFontDownloadClient'],'local-assets':['../src/catalog/local-assets.mjs','createLocalAssetCatalog'],catalog:['../src/catalog/index.mjs','createResourceCatalog'],'svg-pack':['../src/catalog/svg-packs.mjs','createSvgPackLibrary'],'font-pack':['../src/catalog/font-packs.mjs','createFontPackLibrary'],atomic:['../src/ui/atomic.mjs','createAtomicUiLibrary']};
      const[moduleName,factory]=factories[command],library=(await import(moduleName))[factory](config);
      if(['capabilities','categories'].includes(operation)&&values.length===0&&library[operation]){write(await library[operation]());return 0;}
      const request=values[0]?JSON.parse(await readFile(values[0],'utf8')):{};
      if(['search','discover','navigate','details','inspect'].includes(operation)&&values.length<=1&&library[operation]){
        const result=await library[operation](request);
        // Selected source/preview bytes stay in API/files; the CLI reports their lengths.
        for(const key of ['originalSVG','preparedSVG','previewSVG','html','css','script'])if(result&&key in result){result[key+'Bytes']=Buffer.byteLength(result[key]??'');delete result[key];}
        if(result?.license?.text){result.license={...result.license,textBytes:Buffer.byteLength(result.license.text)};delete result.license.text;}
        write(result);return 0;
      }
      if(['acquire','preview','prepare'].includes(operation)&&values.length===2){
        let spec={...request,outputDir:values[1]};
        if(command==='brand-download'&&operation==='prepare'&&spec.parserDir===undefined&&config.parserDir)spec.parserDir=config.parserDir;
        if(command==='atomic'){let selection=request.selection??(request.schemaVersion===1?request:library.select({id:request.id}));if(request.controls)selection=library.customize(selection,request.controls);spec={selection,outputDir:values[1]};}
        const method=command==='atomic'||(command==='font-pack'&&operation==='preview')?'acquire':operation;
        if(typeof library[method]!=='function')throw new Error(`Unsupported ${command} operation: ${operation}`);
        write(await library[method](spec));return 0;
      }
      throw new Error(`Usage: ingenium ${command} capabilities|categories CONFIG | search|discover|navigate|details|inspect CONFIG REQUEST.json | acquire|preview|prepare CONFIG REQUEST.json NEW_OUTPUT_DIR`);
    }
    if (command === 'shapes') {
      const { discoverShapes, createShape, exportShape } = await import('../src/shapes/index.mjs');
      if (rest[0] === 'discover' && rest.length === 1) { write(discoverShapes()); return 0; }
      if (rest[0] === 'create' && rest.length === 3) {
        const shape = createShape(JSON.parse(await readFile(rest[1], 'utf8')));
        write(await exportShape({ shape, outputDir: rest[2] })); return 0;
      }
      throw new Error('Usage: ingenium shapes discover | create PARAMETERS.json NEW_OUTPUT_DIR; API customizeShape preserves the parent hash');
    }
    if (command === 'palettes') {
      const api = await import('../src/palettes/index.mjs');
      if (rest[0] === 'discover' && rest.length <= 2) { write(api.discoverPalettes({ query: rest[1] ?? '' })); return 0; }
      if (rest[0] === 'inspect' && rest.length === 2) { write(api.inspectPalette(rest[1])); return 0; }
      if (rest[0] === 'export' && rest.length === 3) {
        const spec = JSON.parse(await readFile(rest[1], 'utf8'));
        let palette = spec.generate ? api.generatePalette(spec.generate) : api.selectPalette(spec.id, spec.select ?? {});
        if (spec.customize) palette = api.customizePalette(palette, spec.customize);
        const files = Object.fromEntries(['json', 'css', 'svg'].map(format => [`palette.${format}`, api.exportPalette(palette, { format })]));
        const out = resolve(rest[2]);
        if (await realpath(dirname(out)) !== dirname(out)) throw new Error('Output parent must be canonical');
        await mkdir(out);
        for (const [file, bytes] of Object.entries(files)) await writeFile(join(out, file), bytes, { flag: 'wx' });
        write({ outputDir: out, id: palette.id, files: Object.keys(files) }); return 0;
      }
      throw new Error('Usage: ingenium palettes discover [QUERY] | inspect ID | export SPEC.json NEW_OUTPUT_DIR');
    }
    if (command === 'materials') {
      const [operation, configFile, ...values] = rest;
      if (!configFile) throw new Error('Expected operation and CONFIG.json');
      const config = JSON.parse(await readFile(configFile, 'utf8'));
      if (config.packageDir) config.packageDir = resolve(dirname(resolve(configFile)), config.packageDir);
      const library = (await import('../src/materials/index.mjs')).createMaterialLibrary(config);
      if (operation === 'discover' && values.length <= 1) { write(library.discover({ query: values[0] ?? '' })); return 0; }
      if (operation === 'capabilities' && !values.length) { write(await library.capabilities()); return 0; }
      if (operation === 'inspect' && values.length === 1) { write(await library.inspect({ id: values[0] })); return 0; }
      if (operation === 'acquire' && values.length === 2) {
        const spec = JSON.parse(await readFile(values[0], 'utf8'));
        let selection = spec.schemaVersion === 1 ? spec : library.select({ id: spec.id });
        if (spec.schemaVersion !== 1 && spec.controls) selection = library.customize(selection, spec.controls);
        write(await library.acquire({ selection, outputDir: values[1] })); return 0;
      }
      throw new Error('Usage: ingenium materials discover CONFIG [QUERY] | capabilities CONFIG | inspect CONFIG ID | acquire CONFIG SELECTION.json NEW_OUTPUT_DIR');
    }
    if (command === 'items' || command === 'ui') {
      const [operation, configFile, ...values] = rest;
      if (!configFile) throw new Error('Expected operation and CONFIG.json');
      const config = JSON.parse(await readFile(configFile, 'utf8')), base = dirname(resolve(configFile));
      let library;
      if (command === 'items') {
        config.sources = config.sources?.map(path => resolve(base, path));
        if (config.parserDir) config.parserDir = resolve(base, config.parserDir);
        library = (await import('../src/items/index.mjs')).createItemLibrary(config);
      } else {
        if (config.packageDir) config.packageDir = resolve(base, config.packageDir);
        library = (await import('../src/ui/index.mjs')).createUiLibrary(config);
      }
      if (operation === 'discover' && values.length <= 1) { write(await library.discover({ query: values[0] ?? '' })); return 0; }
      if (operation === 'capabilities' && command === 'ui' && !values.length) { write(await library.capabilities()); return 0; }
      if (operation === 'inspect' && values.length === 1) { write(await library.inspect(JSON.parse(await readFile(values[0], 'utf8')))); return 0; }
      if (operation === 'acquire' && values.length === 2) {
        const spec = JSON.parse(await readFile(values[0], 'utf8'));
        write(await library.acquire({ ...(command === 'ui' ? { selection: spec.schemaVersion === 1 ? spec : library.select({ id: spec.id }), ...(spec.schemaVersion === 1 ? {} : { controls: spec.controls ?? {} }) } : spec), outputDir: values[1] })); return 0;
      }
      throw new Error(`Usage: ingenium ${command} discover CONFIG [QUERY] | inspect CONFIG SELECTION.json | acquire CONFIG SELECTION.json NEW_OUTPUT_DIR`);
    }
    if (command === 'library' && rest.length >= 2) {
      const [operation, configFile, ...values] = rest;
      const config = JSON.parse(await readFile(configFile, 'utf8'));
      const base = dirname(resolve(configFile));
      for (const source of config.sources ?? []) {
        if (typeof source.packageDir === 'string') source.packageDir = resolve(base, source.packageDir);
        if (source.license?.path) source.license.path = resolve(base, source.license.path);
      }
      for (const key of ['parserDir', 'iconUtilsDir']) if (config[key]) config[key] = resolve(base, config[key]);
      const { createPackageLibrary } = await import('../src/assets/packages.mjs');
      const library = createPackageLibrary(config);
      if (operation === 'capabilities' && !values.length) { write(await library.capabilities()); return 0; }
      if (operation === 'search' && values.length === 2) { write(await library.search({ kind: values[0], query: values[1] })); return 0; }
      if (operation === 'details' && values.length === 1) { write(await library.details(JSON.parse(await readFile(values[0], 'utf8')))); return 0; }
      if (operation === 'acquire' && values.length === 2) {
        write(await library.acquire({ ...JSON.parse(await readFile(values[0], 'utf8')), outputDir: values[1] })); return 0;
      }
      throw new Error('Usage: ingenium library capabilities CONFIG | search CONFIG font|symbol QUERY | details CONFIG SELECTION.json | acquire CONFIG SELECTION.json NEW_OUTPUT_DIR');
    }
    if (command === 'capabilities' && selector(rest)) {
      const { discoverCapabilities } = await import('../src/svg/index.js');
      write(await discoverCapabilities(selector(rest)));
      return 0;
    }
    if (command === 'check' && rest.length === 1) {
      const { validateRecord } = await import('../src/records/index.mjs');
      const result = validateRecord(JSON.parse(await readFile(rest[0], 'utf8')));
      write(result);
      return result.valid ? 0 : 1;
    }
    if (command === 'render' && rest.length >= 2 && selector(rest.slice(2))) {
      const { exportSvg } = await import('../src/svg/index.js');
      write(await exportSvg({ sourcePath: rest[0], outputPath: rest[1], ...selector(rest.slice(2)) }));
      return 0;
    }
    if (command === 'review' && rest.length >= 2) {
      const options = { fixturePath: rest[0], outputDir: rest[1] };
      const flags = { '--adapter-dir': 'adapterDir', '--executable-path': 'executablePath', '--renderer-dir': 'rendererDir', '--previous': 'previousReportPath' };
      for (let i = 2; i < rest.length; i += 2) {
        const key = flags[rest[i]];
        if (!key || !rest[i + 1] || options[key]) throw new Error('Review options require unique supported flag/value pairs');
        options[key] = rest[i + 1];
      }
      const { reviewFixture } = await import('../src/review/index.mjs');
      const result = await reviewFixture(options);
      write(result);
      return result.status === 'error' || result.status === 'fail' ? 1 : result.status === 'not-run' ? 2 : 0;
    }
    write({ error: 'Usage: ingenium catalog|svg-pack|font-pack|atomic|shapes|palettes|library|items|ui|materials (see resource-libraries reference) | capabilities [--renderer-dir DIR | --sharp-module MODULE] | check RECORD.json | render SOURCE.svg OUTPUT.png [--renderer-dir DIR | --sharp-module MODULE] | review FIXTURE.json NEW_OUTPUT_DIR [--adapter-dir DIR] [--executable-path FILE] [--renderer-dir DIR] [--previous REPORT.json]' });
    return 2;
  } catch (error) {
    write({ error: error.message, ...(error.code ? { code: error.code } : {}), ...(error.setup ? { setup: error.setup } : {}) });
    return 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === await realpath(process.argv[1])) process.exitCode = await main(process.argv.slice(2));
