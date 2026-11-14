# Optional continuation and project history

Import from `src/project-state/index.mjs`. Node 22 or later is required for the optional local store. Guidance-only clients can read/write the portable JSON without Node, a journal, or an installation. Ordinary tasks need no store.

`validateProjectState(state)` is pure and returns `{valid,errors:[{code,path,message,nextStep}]}`. `createContinuation({projectId,brief,record?,...fields})` returns a detached validated envelope with defaults `schema:'ingenium-project/1'`, `revision:0`, `sources:[]`, `outputs:[]`, `nextAction:null`. Required project identity and brief are caller supplied. `migrateProjectState(state)` validates and copies known v1 only; unknown schemas refuse without replacement. Standalone records require explicit `createContinuation({record,projectId,brief})`.

The exact envelope is documented in [project-state-v1.schema.json](../../schemas/project-state-v1.schema.json). Runtime validation also checks ten JSON levels, 1 MiB total JSON, 32 KiB brief, 8 KiB other strings (UTF-8), 256 refs per array, 128 versions/questions/resource selections, resolved version ancestry and safe normalized POSIX paths. Paths cannot contain absolute, drive/UNC, dot/dotdot, backslash, percent-encoded, fragment or query components. Unknown fields, accessors, sparse arrays, cycles and non-JSON values refuse. Each version has its own source/preview identity namespace; current sources/outputs share one namespace. Embedded DeliveryV1 uses the same pure delivery validator.

The optional unchanged nested records-v1 record is the sole structured decision authority. Descriptive records-v1 `source`/`path` fields are never opened. Without a record, no structured chosen-context protection is claimed. Hashes establish integrity, not user authorization or acceptance.

```js
import { createContinuation, createProjectStore } from './src/project-state/index.mjs';
const state = createContinuation({
  projectId: 'signal-study',
  brief: 'Retain all source relationships; change only the requested label.',
  sources: [/* {id,path,sha256,mediaType} for each exact source/dependency */],
});
const store = createProjectStore({root:'/absolute/existing/trusted/project'});
const first = await store.commit({
  expectedHeadHash:null, requestId:'request-1', state,
  change:{kind:'create',summary:'Retain the first editable result.'},
});
const current = await store.read();
current.state.nextAction = 'Revise the requested label.';
await store.commit({
  expectedHeadHash:current.headHash, requestId:'request-2', state:current.state,
  change:{kind:'edit',summary:'Retain the next requested action.'},
});
```

`createProjectStore({root,maxBytes?})` returns these async methods:

| Method | Result |
| --- | --- |
| `read()` | `{state,headHash}`; detached state after complete head/ancestry/tree verification |
| `commit({expectedHeadHash,requestId,state,change})` | `{status:'saved',projectId,revision,headHash,requestId,sourceHashes,durable:true}` |
| `history({offset=0,limit=24}={})` | `{entries:[{commitHash,parentHash,revision,requestId,kind,summary}],nextOffset}`; newest first, limit 1–128 |
| `readVersion({versionId})` | `{state,version,commitHash}`; verified historical owner, named ID or `commit:<64-hex>` reachable from HEAD |
| `materializeVersion({versionId,outputDir})` | `{files,openingFile:'CONTINUATION.md'}`; exclusive new directory, copied selected source/dependency/notice closure and portable continuation |
| `recover({mode:'inspect'})` | `{head,lock,pending,orphans}`; read-only, no selection/deletion |
| `recover({mode:'select',commitHash,expectedHeadHash,expectedHeadFileHash,reason})` | New saved recovery event after both observed head identities match |
| `recover({mode:'release-lock',expectedLockToken,reason})` | `{released:true}` only for positive abandoned local-process-instance evidence; retained metadata/receipt |

`Change` contains required `kind` (`create/edit/reopen/choose/return/migrate/recover`) and nonempty `summary`, plus optional `reason`, `recordChange`, `basedOnVersionId`. Reopen, return and recovery require reasons. Return selects a predecessor-retained basedOnVersionId, keeps the current protected record, sets current sources to that retained direction, and adds a new named version with its exact source/preview refs. The project revision advances; history is never rewound. Edits supply the authoritative *base* project revision; the store increments exactly once. Creation starts at zero. Project identity and existing named versions cannot be rewritten. Existing record changes must equal the result independently reconstructed by unchanged `reviseRecord(base,recordChange)`. Explicit reopen leaves the decision open before a later choice.

Request IDs are caller supplied opaque nonempty strings up to 128 UTF-8 bytes, scoped to the project. A matching request digest reachable from HEAD returns its existing receipt after closure verification and HEAD/directory reflush, even when its original expected head is now stale. Different content with the same ID refuses. Complete orphan requests are not saved and need explicit recovery selection; retry never silently promotes them.

The store uses owner-only `.ingenium` metadata, exclusive process-instance writer locks, immutable canonical manifests and exact artifact bytes. Canonical JSON v1 sorts object keys and preserves array order; hashes use SHA-256 over those UTF-8 bytes. Source refs become `.ingenium/artifacts/<treeHash>/<originalLogicalPath>`. Already verified historical trees keep their identities when working files later change. Embedded delivery artifact and opening-file paths are projected together. New working refs must explicitly include all local dependencies and notices; unchanged dependencies may use verified immutable refs, and their exact bytes are copied into a new source tree when needed. Missing or changed bytes refuse. No network is fetched. Sources may already exist in a new project root, but `expectedHeadHash:null` cannot overwrite an existing metadata store. A missing/changed initial source fails before metadata creation, so restoring that source permits the same initial request to retry. An interrupted first save retains INITIALIZING.json with exact project/request/digest identity. Before any complete commit publication, that identical request may retry without discarding pending files. A published initial orphan needs explicit selection; unknown existing metadata is refused before adding infrastructure files.

Selected resource originalSHA256 and optional derivedSHA256 must match explicitly retained, verified Ref bytes. No basename or descriptive-metadata equivalence is inferred. A changed or unbound selection refuses with RESOURCE_CHANGED; catalog-only observations belong in descriptive context until acquired.

Artifacts are bounded at 64 MiB and 1024 files per tree; `maxBytes` can lower that bound. Preflight and reads require canonical nonsymlink regular files/directories. This is a trusted single-owner local store, not a hostile-content sandbox or protection against another process with the same Unix authority. The local process-identity adapter uses Linux host, boot ID, PID and `/proc` start ticks; unavailable/foreign/ambiguous evidence cannot release a lock. Lock age alone is never sufficient. Append-only per-token exclusive recovery claims also serialize lock-release operations; a crashed claimant may be superseded only with positive local process-instance absence. Claim and lock-release receipts are retained.

Every successful save fsyncs files/directories, publishes immutable artifacts/commits by rename, atomically replaces HEAD and flushes HEAD and its parent before acknowledging. This reports the filesystem's observed flush/rename guarantee; physical power-loss behavior and other operating systems have not been qualified. Unsupported flush support returns `DURABILITY_UNAVAILABLE`, never a durable Saved receipt. A lost acknowledgement may have changed HEAD: read/retry resolves it. Partial pending directories and complete orphan commits remain identifiable. Nothing prunes, overwrites originals, or auto-selects the newest-looking folder.

Healthy-head recovery cannot replace the authoritative record with older choices; use ordinary validated transitions. Corrupt/absent-head disaster recovery explicitly selects a verified chain and records that newer state/choices may be unknown. Use both `head.commitHash` and raw `head.fileHash` from inspect. The recovery creates a new event, preserving the selected historical record's existing claims without inventing acceptance.

Dependency inspection shares the delivery parser: literal SVG/HTML/CSS/JavaScript/Markdown references, explicit local file graphs and valid UTF-8 text up to 1 MiB. Unquoted HTML attributes, unsupported dynamic references and unsupported dependency formats refuse rather than establish a complete save. Actual explicit static node: builtin imports are runtime prerequisites and need no bundled file; bare/unknown packages and dynamic imports remain unsupported. Required external resources refuse; no network is fetched. This bounded static policy does not execute scripts or qualify native-editor behavior.

Materialization copies selected original source bytes and recursively required dependencies/notices into an exclusive directory; it never launches an editor. `continuation.json` contains selected local refs and the historical authoritative record. The selected refs can come from several verified trees. Unreferenced older siblings never collide with selected current bytes. Unrelated historical versions and unreferenced tree members are omitted with an explicit opening note; the original store retains complete history physically. Explicit notice Ref IDs are preserved. Additional original/derived resource closures use resources/<hash>/<logicalPath> when absent from the selected editable closure, preserving their exact bytes and internal relative paths without replacing selected current filenames. `CONTINUATION.md` names the opening file, next action and preserved scope. Partial materializations retain `INCOMPLETE.json` when writable and never claim completion.

`compareProjectVersions({before,after,expectedChanges?,sourceTexts?})` is pure. It reports record/source/output/resource/version changes and matches exact expected change-path strings. Optional text maps `{before:{sourceId:text},after:{sourceId:text}}` support NFC/newline normalization for text/SVG/JSON/JavaScript/XML; they do not open files. Unknown/unsupplied text is `not-run`. Layout is `not-run` because this envelope has no supported explicit layout record. Behavior remains `not-run`; equal hashes cannot establish preserved interaction or acceptance.

Errors are `ProjectStateError` with `code`, `nextStep` and `details`. Codes include `INVALID_STATE`, `UNSUPPORTED_VERSION`, `PATH_ESCAPE`, `LIMIT_EXCEEDED`, `SOURCE_MISSING`, `SOURCE_CHANGED`, `RESOURCE_CHANGED`, `MISSING_DEPENDENCY`, `UNSUPPORTED_DEPENDENCIES`, `LOCKED`, `LOCK_CHANGED`, `STALE_HEAD`, `STALE_REVISION`, `PROTECTED_RECORD`, `IMMUTABLE_VERSION`, `REQUEST_REPLAY_CONFLICT`, `ORPHAN_COMMIT`, `CORRUPT_STATE`, `SPACE_OR_IO`, and `DURABILITY_UNAVAILABLE`. Failure details retain stage, last observed durable head, pending transaction, successful files, whether HEAD was replaced, and `ingenium project recover STORE_DIR --inspect`. Callers retain refused candidate objects for reconciliation; no candidate is silently rebased.

Focused verification is `node --test tests/project-state*.test.mjs tests/records/*.test.mjs`. Tests include actual killed disposable child writers and fresh-process historical SVG edits; no unrelated process is killed or disk filled. The optional second factory argument `{fault(stage)}` is internal fault injection for tests, not a production save option.
