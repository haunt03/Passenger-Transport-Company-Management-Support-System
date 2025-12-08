# Script để thay đổi theme từ xanh sang vàng #EDC531

$files = Get-ChildItem -Path "src" -Include *.jsx,*.js,*.css -Recurse

$replacements = @{
    # Màu xanh cũ -> Màu vàng mới
    "#007BC7" = "#EDC531"
    "#0079BC" = "#EDC531"
    "#0069A8" = "#D4AF1F"
    "#005A8B" = "#A68818"
    "bg-blue-" = "bg-yellow-"
    "text-blue-" = "text-yellow-"
    "border-blue-" = "border-yellow-"
    "hover:bg-blue-" = "hover:bg-yellow-"
    "focus:ring-blue-" = "focus:ring-yellow-"
    "from-blue-" = "from-yellow-"
    "to-blue-" = "to-yellow-"
}

$count = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    
    foreach ($old in $replacements.Keys) {
        $new = $replacements[$old]
        $content = $content -replace [regex]::Escape($old), $new
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "Updated: $($file.FullName)" -ForegroundColor Green
        $count++
    }
}

Write-Host "`nTotal files updated: $count" -ForegroundColor Cyan
Write-Host "Theme changed to yellow (#EDC531) successfully!" -ForegroundColor Yellow
