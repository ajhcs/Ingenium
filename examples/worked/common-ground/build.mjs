import fs from 'node:fs/promises';
import path from 'node:path';
import { createOutput, readFont } from '../resources.mjs';
const out = await createOutput();
const fonts=[['CoverSerif','DejaVuSerif.ttf',400],['CoverSans','DejaVuSans.ttf',400],['CoverSans','DejaVuSans-Bold.ttf',700]];
let css='';
for (const [family,file,weight] of fonts) css+=`@font-face{font-family:${family};font-weight:${weight};src:url(data:font/ttf;base64,${(await readFont(file)).toString('base64')}) format('truetype');}`;
const left=[
'M 365 353 C 199 307 48 382 48 508 C 48 633 199 708 365 662',
'M 365 393 C 228 351 91 408 91 508 C 91 607 228 664 365 622',
'M 365 433 C 253 398 134 434 134 508 C 134 581 253 617 365 582',
'M 365 473 C 282 447 177 463 177 508 C 177 552 282 568 365 542'];
const right=[
'M 475 388 C 641 342 792 417 792 543 C 792 668 641 743 475 697',
'M 475 428 C 612 386 749 443 749 543 C 749 642 612 699 475 657',
'M 475 468 C 587 433 706 469 706 543 C 706 616 587 652 475 617',
'M 475 508 C 558 482 663 498 663 543 C 663 587 558 603 475 577'];
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="280mm" viewBox="0 0 840 1120" role="img" aria-labelledby="cover-title cover-desc">
<title id="cover-title">Common Ground — Issue 04 / Autumn 2026</title>
<desc id="cover-desc">Publication cover. Two groups of open, nested curves face one another in rust and violet. Listening across difference. Conversations on public life and creative practice. Inside: A library after dark / The patient interview / Who gets a seat? Price £12.</desc>
<defs><style>${css}</style></defs>
<rect width="840" height="1120" fill="#f4efdf"/>
<g fill="#23202e">
<text id="issue" x="48" y="47" font-family="CoverSans" font-size="17">Issue 04 / Autumn 2026</text>
<text id="masthead" x="41" y="163" font-family="CoverSerif" font-size="132" letter-spacing="-5"><tspan x="41">Common </tspan><tspan x="41" y="281">Ground</tspan></text>
</g>
<g fill="none" stroke="#b34529" stroke-width="20" stroke-linecap="butt">${left.map(d=>`<path d="${d}"/>`).join('')}</g>
<g fill="none" stroke="#61507c" stroke-width="20" stroke-linecap="butt">${right.map(d=>`<path d="${d}"/>`).join('')}</g>
<g fill="#23202e">
<text id="theme" x="44" y="800" font-family="CoverSans" font-size="64" font-weight="700" letter-spacing="-2.5"><tspan x="44">Listening across </tspan><tspan x="44" y="872">difference</tspan></text>
<text id="subtitle" x="48" y="931" font-family="CoverSans" font-size="20">Conversations on public life and creative practice</text>
<path d="M48 977 H792" stroke="#23202e" stroke-width="1.5"/>
<text id="stories" x="48" y="1017" font-family="CoverSans" font-size="19"><tspan x="48">Inside: A library after dark / </tspan><tspan x="48" y="1048">The patient interview / Who gets a seat?</tspan></text>
<text id="price" x="792" y="1048" font-family="CoverSans" font-size="21" text-anchor="end">£12</text>
</g>
</svg>`;
await fs.writeFile(path.join(out,'cover-v1.svg'),svg,{flag:'wx'});
