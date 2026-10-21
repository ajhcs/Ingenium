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
# A302's completed reconstruction/read evidence is merged only after its owner
# supplies the final inventory. Never infer semantic reading from file hashing.
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
[pscustomobject]@{paths=@($ledger).Count;unique_sha256=@($ledger | Group-Object sha256).Count;completed=@($ledger | Where-Object {$_.read_status -ne 'inventoried-not-read'}).Count;remaining=@($ledger | Where-Object {$_.read_status -eq 'inventoried-not-read'}).Count} | ConvertTo-Json
