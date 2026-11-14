import { lstat, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { hashIdentity } from '../checks/index.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function reportPath(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_./-]+$/.test(value) || value.startsWith('/') || value.split('/').some(p => !p || p === '.' || p === '..')) throw new TypeError('Report links require a contained relative file path');
  return value;
}
/** Pure static projection. Private raw action values, request URLs and console data are not embedded. */
export function renderInspectionReport({ report, coverage, files = [] }) {
  for (const file of files) { reportPath(file.path); if (!/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0) throw new TypeError('Report files require manifest hashes and sizes'); }
  const paths = new Set(files.map(f => f.path));
  const link = (path, label) => { if (!path || !paths.has(path)) return `<span>${escape(label)} unavailable (capture stage incomplete)</span>`; return `<a href="${escape(reportPath(path))}">${escape(label)}</a>`; };
  const count = status => report.issues.filter(i => i.status === status).length;
  const severity = ['error', 'fail', 'not-run', 'review-needed', 'pass', 'not-applicable'];
  const globalIssues = report.issues.filter(i => !coverage.cells.some(c => hashIdentity(c.scope) === hashIdentity(i.scope))).sort((a, b) => severity.indexOf(a.status) - severity.indexOf(b.status));
  const globalFindings = globalIssues.length ? `<section aria-labelledby="run-findings"><h2 id="run-findings">Run findings</h2><ul>${globalIssues.map(i => `<li><strong>${escape(i.status)}</strong> ${escape(i.rule)} — <code>${escape(i.target)}</code> (${escape(Object.values(i.scope).join(' / '))})</li>`).join('')}</ul><p>Resolve the reported run stage or optional capability before retrying into a new directory. Full diagnostics remain in the report JSON.</p></section>` : '';
  const rows = coverage.cells.map((cell, index) => {
    const issues = report.issues.filter(i => hashIdentity(i.scope) === hashIdentity(cell.scope)).sort((a, b) => severity.indexOf(a.status) - severity.indexOf(b.status));
    const dependencies = cell.dependencies ?? { entries: [], observedCount: 0, truncated: false };
    return `<section id="capture-${index + 1}" aria-labelledby="capture-title-${index + 1}"><h2 id="capture-title-${index + 1}">${escape(Object.values(cell.scope).join(' / '))}</h2><p>Capture: <strong>${escape(cell.status)}</strong>. ${escape(cell.failedStage ? `Failed stage: ${cell.failedStage}.` : '')} ${cell.status === 'captured' ? 'Review the findings and editable project before accepting changes.' : 'Resolve this stage and rerun into a new directory.'}</p><p>${link(cell.screenshot, 'Screenshot')} · ${link(cell.raw, 'Raw JSON')}</p><ul>${issues.map(i => `<li><strong>${escape(i.status)}</strong> ${escape(i.rule)} — <code>${escape(i.target)}</code></li>`).join('') || '<li>No findings recorded for this capture.</li>'}</ul><details><summary>Dependencies (${dependencies.observedCount}${dependencies.truncated ? '; truncated after256' : ''})</summary><p>Capture-level observations only; affected elements and exact font glyph selection are unproven.</p><ul>${dependencies.entries.map(d => `<li>${escape(d.type)} · ${escape(d.origin)} · ${escape(d.outcome)}${d.httpStatus ? ` · HTTP${d.httpStatus}` : ''}</li>`).join('') || '<li>No request observation retained.</li>'}</ul></details></section>`;
  }).join('');
  return {
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'"><title>Ingenium inspection</title><link rel="stylesheet" href="report.css"></head><body><main><h1>Project inspection</h1><p class="coverage"><strong>${coverage.requested} requested · ${coverage.captured} captured · ${coverage.failed} failed · ${coverage.missing} missing</strong></p><p>${coverage.failed || coverage.missing ? 'Inspection is incomplete. Resolve failed and missing work before relying on comparisons.' : 'Requested execution finished. Findings and human acceptance remain separate.'}</p><p>Check findings: ${count('error')} errors · ${count('fail')} failing · ${count('review-needed')} for review · ${count('not-run')} not run.</p><p>Completion is recorded by manifest.json. An HTML report alone does not establish completion.</p>${globalFindings}<nav aria-label="Captures"><ul>${coverage.cells.map((c, i) => `<li><a href="#capture-${i + 1}">${escape(Object.values(c.scope).join(' / '))} (${escape(c.status)})</a></li>`).join('')}</ul></nav><p>${link('report.json', 'Full report JSON')} · ${link('snapshot.json', 'Snapshot JSON')} · ${link('run.json', 'Run progress')}</p>${rows}<p>Rendered DOM, authored assertions and selected routes only. CSS font availability can involve fallback. Blocked dependencies can change rendering. No taste score, full accessibility certification or inferred acceptance.</p></main></body></html>`,
    css: `:root{font-family:system-ui,sans-serif;color:#182127;background:#fff;line-height:1.6}*{box-sizing:border-box}body{margin:0;overflow-wrap:anywhere}main{max-width:74rem;margin:auto;padding:clamp(.75rem,3vw,2rem)}h1,h2{line-height:1.2}h2{font-size:1.2rem}section{border-top:1px solid #9aa7ad;margin-top:2rem;padding-top:1rem}a{color:#174d86;text-underline-offset:.2em}a:focus-visible,summary:focus-visible{outline:3px solid #174d86;outline-offset:3px}code,li,p,a{overflow-wrap:anywhere}ul{padding-left:1.3rem}.coverage{border:2px solid #465760;padding:1rem}summary{cursor:pointer}nav ul{display:flex;flex-wrap:wrap;gap:.5rem 2rem}nav li{max-width:100%}@media(max-width:24rem){nav ul{display:block}}`,
  };
}

/** Verify every selected link against actual local bytes before writing the static report. */
export async function writeInspectionReport({ outputDir, report, coverage, files }) {
  for (const file of files) {
    const path = reportPath(file.path);
    let current = outputDir;
    for (const part of path.split('/')) { current = join(current, part); const stat = await lstat(current); if (stat.isSymbolicLink()) throw new TypeError('Report links cannot traverse symlinks'); }
    const stat = await lstat(current), bytes = await readFile(current);
    if (!stat.isFile() || stat.size !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw new TypeError('Report file differs from its selected manifest identity');
  }
  const result = renderInspectionReport({ report, coverage, files });
  await writeFile(join(outputDir, 'report.css'), result.css, { flag: 'wx' });
  await writeFile(join(outputDir, 'index.html'), result.html, { flag: 'wx' });
  return { html: 'index.html', css: 'report.css' };
}
