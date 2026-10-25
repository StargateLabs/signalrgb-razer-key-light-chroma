param(
    [Parameter(Mandatory=$true)][System.Net.IPAddress]$IPAddress
)
$ErrorActionPreference = 'Stop'
if ($IPAddress.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork -or [System.Net.IPAddress]::IsLoopback($IPAddress) -or $IPAddress.Equals([System.Net.IPAddress]::Any) -or $IPAddress.Equals([System.Net.IPAddress]::Broadcast)) { throw 'Serve un indirizzo IPv4 della lampada / Use the lamp IPv4 address.' }
$folder = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'WhirlwindFX\Plugins'
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$name = 'Razer_Key_Light_Chroma.js'
$target = Join-Path $folder $name
if (Test-Path -LiteralPath $target) { Copy-Item -LiteralPath $target -Destination ($target+'.before-stargatelabs') -Force }
$source = [IO.File]::ReadAllText((Join-Path $PSScriptRoot ('plugin\'+$name)))
$source = [regex]::Replace($source, 'const DEFAULT_HOST = "[^"]*";', ('const DEFAULT_HOST = "'+$IPAddress.ToString()+'";'))
[IO.File]::WriteAllText($target, $source, (New-Object System.Text.UTF8Encoding($false)))
$qml = Join-Path $folder 'Razer_Key_Light_Chroma.qml'
if (Test-Path -LiteralPath $qml) { Copy-Item -LiteralPath $qml -Destination ($qml+'.before-stargatelabs') -Force }
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'plugin\Razer_Key_Light_Chroma.qml') -Destination $folder -Force
Write-Host 'Restart SignalRGB. Close other Key Light controllers / Riavvia SignalRGB e chiudi gli altri controller della lampada.'
