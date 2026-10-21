param([Parameter(Mandatory=$true)][string]$SourceDir)
$ErrorActionPreference='Stop'
$sourceRoot=(Resolve-Path $SourceDir).Path
$commit=git -C $sourceRoot rev-parse HEAD
$all=git -C $sourceRoot ls-files
$skills=@($all | Where-Object {$_ -match '(^|/)SKILL\.md$' -and $_ -notmatch '^(skills/|design-templates/|plugins/_official/examples/)'} )
$dirs=@($skills | ForEach-Object { $_.Substring(0,$_.LastIndexOf('/')+1) })
$selectionPattern='^(?:'+(($dirs | ForEach-Object {[regex]::Escape($_)}) -join '|')+')'
$rows=foreach($p in $all){
 if($p -notmatch $selectionPattern){continue}
 $f=Join-Path $sourceRoot $p
 $item=Get-Item -LiteralPath $f
 [pscustomobject]@{repository='nexu-io/open-design';commit=$commit;path=$p;bytes=$item.Length;sha256=(Get-FileHash -LiteralPath $f -Algorithm SHA256).Hash.ToLower();kind=if($p -match '(^|/)SKILL\.md$'){'skill'}elseif($p -match 'LICENSE|NOTICE|OFL|COPYING'){'license'}elseif($p -match '\.md$'){'reference'}else{'support'};read_status=if($p -match '(^|/)SKILL\.md$'){'read-full'}elseif($p -match '^plugins/community/(hallmark|humanize-ppt)/LICENSE$'){'read-excerpt'}else{'inventoried-not-read'};reader='skills-team-lead';notes=if($p -match 'hallmark/SKILL\.md$'){'Read in five contiguous character ranges; complete body.'}else{''}}
}
$rows | Sort-Object path | Export-Csv -Encoding utf8 -NoTypeInformation (Join-Path $PSScriptRoot 'open-design-b-inventory.csv')
$rows | Group-Object kind,read_status | Select-Object Count,Name | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $PSScriptRoot 'open-design-b-counts.json')

$baseline=(Resolve-Path (Join-Path $PSScriptRoot '../../skills/ingenium')).Path
$readBaseline=@('SKILL.md','references/composition.md','references/palettes.md','references/record-contract.md','references/checks.md','references/interaction-sketches.md','references/design-methods.md','references/assets.md','references/resource-libraries.md')
Get-ChildItem $baseline -Recurse -File | ForEach-Object {
 $p=$_.FullName.Substring($baseline.Length+1).Replace('\','/')
 [pscustomobject]@{repository='Ingenium';commit='f70db6171196c2c4452bc53eb24e82ba7cad5d9c';path=('skills/ingenium/'+$p);bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower();read_status=if($readBaseline -contains $p){'read-full'}else{'inventoried-not-read'}}
} | Export-Csv -Encoding utf8 -NoTypeInformation (Join-Path $PSScriptRoot 'baseline-lead-inventory.csv')
