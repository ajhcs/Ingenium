import { dirname, resolve } from 'node:path';
import { boundedFile, checkedRoot, sha256 } from '../project-state/files.mjs';

/** Read only explicit current refs. Never traverse descriptive record fields or links. */
export async function summarizeContinuation(state, continuationPath) {
  const root = await checkedRoot(dirname(resolve(continuationPath)));
  const refs = [];
  for (const [kind, selected] of [['source', state.sources], ['preview', state.outputs]]) {
    for (const ref of selected) {
      let observation;
      try {
        const bytes = await boundedFile(root, ref.path, 64 * 1024 * 1024);
        const actualSHA256 = sha256(bytes);
        observation = actualSHA256 === ref.sha256
          ? { status: 'verified', actualSHA256 }
          : { status: 'changed', code: 'SOURCE_CHANGED', actualSHA256, message: 'Bytes differ from the declared hash; review the source before explicitly revising its reference.' };
      } catch (error) {
        observation = { status: 'unavailable', code: error.code === 'ENOENT' ? 'SOURCE_MISSING' : error.code ?? 'SOURCE_UNREADABLE', message: error.code === 'ENOENT' ? 'Restore this exact relative file or explicitly revise its reference.' : 'Cannot verify a bounded canonical regular file; inspect its path, permissions and size.' };
      }
      refs.push({ kind, id: ref.id, path: ref.path, expectedSHA256: ref.sha256, ...observation });
    }
  }
  const verified = refs.filter(ref => ref.status === 'verified').length;
  return {
    schema: 'ingenium-continuation-summary/1', projectId: state.projectId, revision: state.revision,
    brief: state.brief, openingSources: state.sources, previews: state.outputs,
    choices: state.record?.decisions ?? [], openQuestions: state.openQuestions, nextAction: state.nextAction,
    sourceVerification: { status: verified === refs.length ? refs.length ? 'pass' : 'not-applicable' : 'fail', verified, refs,
      scope: 'Explicit current sources and outputs relative to the continuation file directory; historical refs, descriptive record fields and linked dependency completeness are not checked.' },
    saved: false,
  };
}
