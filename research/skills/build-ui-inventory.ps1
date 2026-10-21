param([string]$SourceRoot = '../../../upstream-skills/ui-ux-pro-max-skill')
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path $SourceRoot).Path
$commit = git -C $root rev-parse HEAD
$out = $PSScriptRoot
$read = @(
 '.claude/skills/banner-design/SKILL.md', '.claude/skills/brand/SKILL.md',
 '.claude/skills/design/SKILL.md', '.claude/skills/design-system/SKILL.md',
 '.claude/skills/slides/SKILL.md', '.claude/skills/ui-styling/SKILL.md',
 '.claude/skills/ui-ux-pro-max/SKILL.md',
 '.claude/skills/banner-design/references/banner-sizes-and-styles.md',
 '.claude/skills/brand/references/voice-framework.md',
 '.claude/skills/brand/references/messaging-framework.md',
 '.claude/skills/brand/references/visual-identity.md',
 '.claude/skills/brand/references/consistency-checklist.md',
 '.claude/skills/brand/references/update.md',
 '.claude/skills/brand/references/approval-checklist.md',
 '.claude/skills/design/references/design-routing.md',
 '.claude/skills/design/references/social-photos-design.md',
 '.claude/skills/design-system/references/token-architecture.md',
 '.claude/skills/design-system/references/semantic-tokens.md',
 '.claude/skills/design-system/references/component-specs.md',
 '.claude/skills/ui-ux-pro-max/references/pro-rules.md',
 '.claude/skills/ui-ux-pro-max/references/quick-reference.md',
 '.claude/skills/ui-styling/LICENSE.txt', 'LICENSE'
)
$partial = @('.claude/skills/ui-styling/canvas-fonts/ArsenalSC-OFL.txt', 'src/ui-ux-pro-max/templates/base/skill-content.md')
$paths = git -C $root ls-files
$rows = foreach ($p in $paths) {
 if ($p -notmatch '^(\.claude/skills/|cli/assets/skills/|src/ui-ux-pro-max/)' -and $p -notmatch '(^LICENSE$|NOTICE|OFL)') { continue }
 $full = Join-Path $root $p
 if (-not (Test-Path -LiteralPath $full -PathType Leaf)) { continue }
 $item = Get-Item -LiteralPath $full
 [pscustomobject]@{repository='nextlevelbuilder/ui-ux-pro-max-skill';commit=$commit;path=$p;bytes=$item.Length;sha256=(Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLower();kind=if($p -match 'SKILL\.md$'){'skill'}elseif($p -match 'LICENSE|OFL|NOTICE'){'license'}elseif($p -match '\.md$'){'reference'}elseif($p -match '\.(csv|json)$'){'data'}elseif($p -match '\.(ttf|woff2?)$'){'font-binary'}else{'operational-source'};read_status=if($read -contains $p){'read-full'}elseif($partial -contains $p){'read-excerpt'}else{'inventoried-not-read'};representative=''}
}
$readHashes = @{}
foreach($r in $rows) { if($r.read_status -eq 'read-full'){$readHashes[$r.sha256]=$r.path} }
foreach($r in $rows) { if($r.read_status -ne 'read-full' -and $readHashes.ContainsKey($r.sha256)){$r.read_status='byte-identical-to-read';$r.representative=$readHashes[$r.sha256]} }
$rows | Sort-Object path | Export-Csv -NoTypeInformation -Encoding utf8 (Join-Path $out 'ui-ux-inventory.csv')
$rows | Group-Object kind,read_status | Select-Object Count,Name | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $out 'ui-ux-coverage-counts.json')
