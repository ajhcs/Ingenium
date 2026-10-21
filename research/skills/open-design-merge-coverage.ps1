# Study-authored inventory merger; does not execute upstream source.
param([string]$SourceRoot = 'upstream-skills/open-design')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath $SourceRoot).Path
$ledgerPath = Join-Path $PSScriptRoot 'open-design-inventory.json'
$ledger = Get-Content -LiteralPath $ledgerPath -Raw -Encoding utf8 | ConvertFrom-Json
$bPath = Join-Path $PSScriptRoot 'open-design-b-inventory.csv'
if (Test-Path -LiteralPath $bPath) {
  $b = Import-Csv -LiteralPath $bPath | Where-Object {$_.kind -eq 'skill'}
  foreach ($r in $b) {
    $m = $ledger | Where-Object {$_.path -ceq $r.path}
    if (@($m).Count -ne 1 -or $m.sha256 -cne $r.sha256) {throw "B source mismatch: $($r.path)"}
    $m.read_status = $r.read_status
    $m.reader = $r.reader
    $m.evidence = 'open-design-b-inventory.csv;open-design-b-review.md'
  }
}
# A302 is merged only from the owner's completed reconstruction/read receipts.
# Pending aggregation never promotes a file. Hashing alone is not reading.
$aPath = Join-Path $PSScriptRoot 'open-design-template-reader-components/coverage.json'
if (Test-Path -LiteralPath $aPath) {
  $a = Get-Content -LiteralPath $aPath -Raw -Encoding utf8 | ConvertFrom-Json
  if ($a.pin -cne '8d820a698908dc279ef3d5aeb4ce6d156211a499') {throw 'A source pin mismatch'}
  if ($a.counts.assignedFiles -eq 302 -and $a.counts.completeFiles -eq 302 -and $a.counts.partialFiles -eq 0 -and $a.counts.readBatches -eq 40 -and $a.counts.readSemanticBlocks -eq $a.counts.semanticBlocks) {
    foreach ($r in $a.files) {
      $m = $ledger | Where-Object {$_.path -ceq $r.path}
      if (@($m).Count -ne 1 -or $m.sha256 -cne $r.sha256 -or $r.read_status -cne 'read-complete-block-reconstruction' -or @($r.missingSemanticBlocks).Count -ne 0) {throw "A source/read evidence mismatch: $($r.path)"}
      $m.read_status = $r.read_status
      $m.reader = @($r.reader) -join ';'
      $m.evidence = 'open-design-template-reader-components/coverage.json;block-manifest.json;completed batch reader receipts'
    }
  }
}
foreach ($m in $ledger) {
  $file = Join-Path $root $m.path
  $hash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($hash -cne $m.sha256) {throw "Pinned checkout source mismatch: $($m.path)"}
}
$ledger | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ledgerPath -Encoding utf8
$ledger | Export-Csv -NoTypeInformation -LiteralPath (Join-Path $PSScriptRoot 'open-design-inventory.csv') -Encoding utf8
$aliases = $ledger | Group-Object sha256 | ForEach-Object {
  $canonical = $_.Group | Sort-Object path | Select-Object -First 1
  foreach ($m in $_.Group) {
    [pscustomobject]@{path=$m.path;sha256=$m.sha256;byte_alias_group_size=$_.Count;canonical_path=$canonical.path;read_status=$m.read_status;evidence=$m.evidence}
  }
}
$aliases | Export-Csv -NoTypeInformation -LiteralPath (Join-Path $PSScriptRoot 'open-design-byte-aliases.csv') -Encoding utf8
$summary = [pscustomobject]@{source='nexu-io/open-design';pin='8d820a698908dc279ef3d5aeb4ce6d156211a499';paths=@($ledger).Count;unique_sha256=@($ledger | Group-Object sha256).Count;completed=@($ledger | Where-Object {$_.read_status -ne 'inventoried-not-read'}).Count;remaining=@($ledger | Where-Object {$_.read_status -eq 'inventoried-not-read'}).Count;read_status_counts=@($ledger | Group-Object read_status | ForEach-Object {[pscustomobject]@{status=$_.Name;count=$_.Count}});limits='Exact body/text reading evidence only; references retain their separate statuses. Block reconstruction is not holistic per-skill evaluation. No upstream script execution, runtime validation, asset/license clearance or future-model superiority claim.'}
$summary | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'open-design-coverage-summary.json') -Encoding utf8
$summary | ConvertTo-Json -Depth 5
