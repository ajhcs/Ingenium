#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { link, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateManifest } from './run-behavioral-evaluation.mjs';

const defaultManifest = fileURLToPath(new URL('../tests/fixtures/evaluation/manifest.json', import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const present = value => typeof value === 'string' && value.trim().length > 0;

export async function recordBehavioralReview({ runDir, reviewPath, manifestPath = defaultManifest }) {
  const [producerBytes, reviewBytes, manifestBytes] = await Promise.all([
    readFile(path.join(runDir, 'result.json')), readFile(reviewPath), readFile(manifestPath),
  ]);
  const producer = JSON.parse(producerBytes);
  const review = JSON.parse(reviewBytes);
  const manifest = JSON.parse(manifestBytes);
  const errors = validateManifest(manifest);
  if (errors.length) throw new Error(errors.join('\n'));

  if (producer?.schema !== 'ingenium-behavioral-result/1' || producer.status !== 'observed-needs-review'
      || producer.process?.code !== 0 || producer.process.timedOut || producer.process.overflow
      || !Array.isArray(producer.judgments) || producer.judgments.length !== 0) {
    throw new Error('Expected a completed producer receipt with pending review');
  }
  const receiptHash = digest(producerBytes);
  if (review?.schema !== 'ingenium-behavioral-review/1' || review.receiptSHA256 !== receiptHash
      || !present(review.reviewer) || typeof review.versionsMasked !== 'boolean') {
    throw new Error('Expected review version 1, the exact producer SHA-256, and reviewer provenance');
  }

  const questions = manifest.cases.find(item => item.id === producer.id)?.judgmentQuestions;
  if (!questions?.length || !Array.isArray(review.judgments) || review.judgments.length !== questions.length) {
    throw new Error('Review must answer every judgment question in the selected case');
  }
  const evidenceRoot = path.dirname(path.resolve(reviewPath));
  const judgments = [];
  for (const [index, question] of questions.entries()) {
    const judgment = review.judgments[index];
    if (judgment?.question !== question || !present(judgment.answer)
        || !Array.isArray(judgment.evidence) || !judgment.evidence.length) {
      throw new Error(`Expected ordered answer and evidence for: ${question}`);
    }
    for (const ref of judgment.evidence) {
      if (!present(ref) || ref.split('/').some(part => !part || part === '.' || part === '..') || /[:\\\\]/.test(ref)) {
        throw new Error('Evidence paths must be relative to the review JSON');
      }
      if (!(await stat(path.join(evidenceRoot, ref))).isFile()) throw new Error(`Expected an evidence file: ${ref}`);
    }
    judgments.push({ question, answer: judgment.answer, evidence: judgment.evidence });
  }

  const reviewed = {
    ...producer,
    status: 'reviewed',
    judgments,
    review: {
      reviewer: review.reviewer,
      versionsMasked: review.versionsMasked,
      receiptSHA256: receiptHash,
      reviewSHA256: digest(reviewBytes),
      manifestSHA256: digest(manifestBytes),
      evidenceRoot: path.relative(path.resolve(runDir), evidenceRoot) || '.',
    },
  };
  const destination = path.join(runDir, 'result.reviewed.json');
  const temporary = await mkdtemp(path.join(runDir, '.review-'));
  try {
    const file = path.join(temporary, 'result.json');
    await writeFile(file, JSON.stringify(reviewed, null, 2) + '\n', { mode: 0o600 });
    await link(file, destination);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  return destination;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [runDir, reviewPath, manifestPath, extra] = process.argv.slice(2);
    if (!runDir || !reviewPath || extra) throw new Error('Usage: record-behavioral-review.mjs RUN_DIR REVIEW.json [MANIFEST.json]');
    console.log(await recordBehavioralReview({ runDir, reviewPath, manifestPath }));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
