param([string]$Workspace = (Resolve-Path "$PSScriptRoot/../../..").Path)
$ErrorActionPreference = 'Stop'
$out = $PSScriptRoot
$configs = @(
  @{ name='java-design-patterns'; sha='4cabb204f240240bea319605a5ffa46ded728001'; full=@('LICENSE.md','CONTRIBUTING.MD'); prose=@('strategy/README.md','command/README.md','memento/README.md','observer/README.md','adapter/README.md','composite/README.md','model-view-controller/README.md','model-view-viewmodel/README.md','state/README.md','command-query-responsibility-segregation/README.md') },
  @{ name='diagram-design'; sha='7a12007b5a4246894f342a2e52e78facbc62eca3'; full=@('LICENSE','THIRD_PARTY_LICENSES.md','skills/diagram-design/SKILL.md','skills/diagram-design/references/semantic-patterns.md','skills/diagram-design/references/primitives-core.md','skills/diagram-design/references/layout-budget.md','skills/diagram-design/references/type-architecture-delta.md','skills/diagram-design/references/type-state.md','skills/diagram-design/references/type-sequence.md','skills/diagram-design/references/import-mermaid.md','skills/diagram-design/references/export-registry.md','skills/diagram-design/references/type-service-blueprint.md'); prose=@() }
)
$summary = @()
$configs[1].full += @('docs/adr/0002-semantic-patterns-do-not-expand-the-taxonomy.md','docs/adr/0005-label-geometry-is-verified.md','skills/diagram-design/references/type-dependency.md','skills/diagram-design/references/type-tree.md','skills/diagram-design/references/type-swimlane.md','skills/diagram-design/references/type-flowchart.md')
foreach ($config in $configs) {
  $root = Join-Path $Workspace ('sources/'+$config.name)
  $tree = git -C $root ls-tree -r $config.sha
  $rows = foreach ($line in $tree) {
    if ($line -notmatch '^\d+ blob ([0-9a-f]+)\t(.+)$') { throw "Unexpected tree entry: $line" }
    $oid=$Matches[1]; $path=$Matches[2]
    $class='implementation-or-configuration'; $status='inventoried-not-read'
    if ($path -match '(?i)(^|/)(license[^/]*|notice[^/]*|third_party[^/]*)$|lgpl-3.0.txt$') { $class='license-or-notice' }
    elseif ($path -match '(?i)(^|/)SKILL\.md$') { $class='skill-entrypoint' }
    elseif ($path -like 'skills/*/references/*') { $class='operational-reference' }
    elseif ($path -like 'skills/*/scripts/*') { $class='operational-helper-not-executed' }
    elseif ($path -like 'skills/*/assets/*') { $class='operational-template-or-example-not-executed' }
    elseif ($path -like 'localization/*') { $class='localized-doc-variant' }
    elseif ($path -match '^[^/]+/README\.md$') { $class='primary-pattern-documentation' }
    elseif ($path -match '(?i)\.md$') { $class='project-documentation' }
    elseif ($path -match '(?i)\.(png|jpg|jpeg|gif|webp|svg|woff2?|ttf|pdf)$') { $class='binary-or-visual-resource-not-reviewed' }
    if ($config.full -ccontains $path) { $status='read-full' }
    if ($config.prose -ccontains $path) { $status='read-prose-code-fences-omitted' }
    if ($config.name -eq 'java-design-patterns' -and $path -ceq 'README.md') { $status='read-introduction-through-license-before-contributors' }
    [pscustomobject]@{ repository=$config.name; commit=$config.sha; path=$path; gitBlobSHA1=$oid; classification=$class; readStatus=$status }
  }
  $rows | Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $out ('patterns-diagrams-'+$config.name+'-inventory.csv'))
  $summary += [pscustomobject]@{repository=$config.name;commit=$config.sha;trackedFiles=@($rows).Count;skillFiles=@($rows | Where-Object classification -eq 'skill-entrypoint').Count;references=@($rows | Where-Object classification -eq 'operational-reference').Count;read=@($rows | Where-Object readStatus -ne 'inventoried-not-read').Count}
}
$summary | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $out 'patterns-diagrams-summary.json')
$summary | Format-Table
$localRoot = Join-Path $Workspace 'team-resources'
$localPaths = @('skills/ingenium/SKILL.md','skills/ingenium/references/domains.md','skills/ingenium/references/composition.md','skills/ingenium/references/interaction-sketches.md','skills/ingenium/references/design-methods.md','skills/ingenium/references/svg.md','skills/ingenium/references/checks.md','skills/ingenium/references/resource-libraries.md','skills/ingenium/references/methods/contract.md','skills/ingenium/references/methods/state-sequence.md')
$localRows = foreach ($path in $localPaths) {
  [pscustomobject]@{ repository='Ingenium'; commit='f70db6171196c2c4452bc53eb24e82ba7cad5d9c'; path=$path; gitBlobSHA1=(git -C $localRoot rev-parse ('f70db6171196c2c4452bc53eb24e82ba7cad5d9c:'+$path)); classification='baseline-comparison-guidance'; readStatus='read-full' }
}
$localRows | Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $out 'patterns-diagrams-ingenium-comparison.csv')
