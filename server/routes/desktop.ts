import { Router } from 'express';
import type { Request } from 'express';

export const desktopRouter = Router();

function resolveAppOrigin(req: Request): string {
  const fromQuery = typeof req.query.origin === 'string' ? req.query.origin.trim() : '';
  if (fromQuery && /^https?:\/\/[a-zA-Z0-9._:-]+$/.test(fromQuery)) {
    return fromQuery.replace(/\/+$/, '');
  }
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto =
    typeof protoHeader === 'string' ? protoHeader.split(',')[0].trim() : req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  return `${proto}://${String(host).split(',')[0].trim()}`;
}

// 1. Windows Double-Clickable Desktop App Installer (.bat)
// Downloads official indeecheck.ico into %LOCALAPPDATA%\IndeeCheck and creates a Desktop & Start Menu .lnk
// launching Edge or Chrome in chromeless standalone --app window mode with the Independence icon!
desktopRouter.get('/windows-installer.bat', (req, res) => {
  const origin = resolveAppOrigin(req);
  const iconUrl = `${origin}/indeecheck.ico`;

  const batLines = [
    '@echo off',
    'title Install IndeeCheck Desktop App',
    'echo Installing IndeeCheck (City of Independence, IA Planning ^& Zoning) onto your Desktop...',
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "` +
      `$appDir = Join-Path $env:LOCALAPPDATA 'IndeeCheck'; ` +
      `New-Item -ItemType Directory -Force -Path $appDir | Out-Null; ` +
      `$icoPath = Join-Path $appDir 'indeecheck.ico'; ` +
      `try { Invoke-WebRequest -Uri '${iconUrl}' -OutFile $icoPath -UseBasicParsing } catch {}; ` +
      `$edgePaths = @(\\"$env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe\\", \\"\${env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe\\"); ` +
      `$chromePaths = @(\\"$env:ProgramFiles\\Google\\Chrome\\Application\\chrome.exe\\", \\"\${env:ProgramFiles(x86)}\\Google\\Chrome\\Application\\chrome.exe\\", \\"$env:LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe\\"); ` +
      `$bravePaths = @(\\"$env:ProgramFiles\\BraveSoftware\\Brave-Browser\\Application\\brave.exe\\", \\"$env:LOCALAPPDATA\\BraveSoftware\\Brave-Browser\\Application\\brave.exe\\"); ` +
      `$progId = try { (Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice' -ErrorAction Stop).ProgId } catch { '' }; ` +
      `$browser = $null; ` +
      `if ($progId -like 'ChromeHTML*') { $browser = ($chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1) } ` +
      `elseif ($progId -like 'MSEdge*') { $browser = ($edgePaths | Where-Object { Test-Path $_ } | Select-Object -First 1) } ` +
      `elseif ($progId -like 'BraveHTML*') { $browser = ($bravePaths | Where-Object { Test-Path $_ } | Select-Object -First 1) }; ` +
      `$wsh = New-Object -ComObject WScript.Shell; ` +
      `$desktopPath = [Environment]::GetFolderPath('Desktop'); ` +
      `$lnk = $wsh.CreateShortcut((Join-Path $desktopPath 'IndeeCheck - Planning & Zoning.lnk')); ` +
      `if ($browser) { $lnk.TargetPath = $browser; $lnk.Arguments = '--app=${origin}' } else { $lnk.TargetPath = '${origin}' }; ` +
      `if (Test-Path $icoPath) { $lnk.IconLocation = \\"$icoPath,0\\" }; ` +
      `$lnk.Description = 'City of Independence, IA Planning, Zoning, Floodplain & Fence Compliance'; ` +
      `$lnk.Save(); ` +
      `$startMenu = [Environment]::GetFolderPath('Programs'); ` +
      `$smLnk = $wsh.CreateShortcut((Join-Path $startMenu 'IndeeCheck - Planning & Zoning.lnk')); ` +
      `if ($browser) { $smLnk.TargetPath = $browser; $smLnk.Arguments = '--app=${origin}' } else { $smLnk.TargetPath = '${origin}' }; ` +
      `if (Test-Path $icoPath) { $smLnk.IconLocation = \\"$icoPath,0\\" }; ` +
      `$smLnk.Save();"`,
    'echo.',
    'echo Success! "IndeeCheck - Planning & Zoning" has been placed on your Desktop and Start Menu.',
    'timeout /t 4',
  ];

  res.setHeader('Content-Type', 'application/x-bat; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="Install-IndeeCheck-Desktop.bat"'
  );
  res.send(batLines.join('\r\n'));
});

// 2. Standard Windows Internet Shortcut (.url)
desktopRouter.get('/windows-shortcut.url', (req, res) => {
  const origin = resolveAppOrigin(req);
  const content = [
    '[InternetShortcut]',
    `URL=${origin}/`,
    `IconFile=${origin}/indeecheck.ico`,
    'IconIndex=0',
    '',
  ].join('\r\n');

  res.setHeader('Content-Type', 'application/internet-shortcut; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="IndeeCheck - Planning & Zoning.url"'
  );
  res.send(content);
});

// 3. macOS Double-Clickable Desktop .app Bundle Installer (.command)
desktopRouter.get('/macos-installer.command', (req, res) => {
  const origin = resolveAppOrigin(req);
  const pngUrl = `${origin}/icons/icon-512.png`;

  const script = `#!/bin/bash
set -e
APP_PATH="$HOME/Desktop/IndeeCheck.app"
mkdir -p "$APP_PATH/Contents/MacOS" "$APP_PATH/Contents/Resources"

cat > "$APP_PATH/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>IndeeCheck</string>
  <key>CFBundleIdentifier</key>
  <string>gov.independenceia.indeecheck</string>
  <key>CFBundleName</key>
  <string>IndeeCheck</string>
  <key>CFBundleDisplayName</key>
  <string>IndeeCheck — Planning &amp; Zoning</string>
  <key>CFBundleIconFile</key>
  <string>AppIcon</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleVersion</key>
  <string>1.0.0</string>
</dict>
</plist>
EOF

cat > "$APP_PATH/Contents/MacOS/IndeeCheck" <<'LAUNCHER'
#!/bin/bash
URL="${origin}"
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="$URL"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "Microsoft Edge" --args --app="$URL"
else
  open "$URL"
fi
LAUNCHER
chmod +x "$APP_PATH/Contents/MacOS/IndeeCheck"

TMP_ICON=$(mktemp -d)
if curl -fsSL "${pngUrl}" -o "$TMP_ICON/icon.png"; then
  mkdir -p "$TMP_ICON/AppIcon.iconset"
  sips -z 16 16     "$TMP_ICON/icon.png" --out "$TMP_ICON/AppIcon.iconset/icon_16x16.png" >/dev/null 2>&1 || true
  sips -z 32 32     "$TMP_ICON/icon.png" --out "$TMP_ICON/AppIcon.iconset/icon_16x16@2x.png" >/dev/null 2>&1 || true
  sips -z 32 32     "$TMP_ICON/icon.png" --out "$TMP_ICON/AppIcon.iconset/icon_32x32.png" >/dev/null 2>&1 || true
  sips -z 64 64     "$TMP_ICON/icon.png" --out "$TMP_ICON/AppIcon.iconset/icon_32x32@2x.png" >/dev/null 2>&1 || true
  sips -z 128 128   "$TMP_ICON/icon.png" --out "$TMP_ICON/AppIcon.iconset/icon_128x128.png" >/dev/null 2>&1 || true
  sips -z 256 256   "$TMP_ICON/icon.png" --out "$TMP_ICON/AppIcon.iconset/icon_128x128@2x.png" >/dev/null 2>&1 || true
  sips -z 256 256   "$TMP_ICON/icon.png" --out "$TMP_ICON/AppIcon.iconset/icon_256x256.png" >/dev/null 2>&1 || true
  sips -z 512 512   "$TMP_ICON/icon.png" --out "$TMP_ICON/AppIcon.iconset/icon_256x256@2x.png" >/dev/null 2>&1 || true
  sips -z 512 512   "$TMP_ICON/icon.png" --out "$TMP_ICON/AppIcon.iconset/icon_512x512.png" >/dev/null 2>&1 || true
  iconutil -c icns "$TMP_ICON/AppIcon.iconset" -o "$APP_PATH/Contents/Resources/AppIcon.icns" >/dev/null 2>&1 || true
fi
rm -rf "$TMP_ICON"
touch "$APP_PATH"
echo "Installed IndeeCheck.app onto your Desktop!"
`;

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="Install-IndeeCheck-Mac.command"'
  );
  res.send(script);
});

// 4. Linux .desktop Shortcut
desktopRouter.get('/linux-shortcut.desktop', (req, res) => {
  const origin = resolveAppOrigin(req);
  const content = `[Desktop Entry]
Version=1.0
Type=Application
Name=IndeeCheck — Planning & Zoning
Comment=City of Independence, IA Planning, Zoning, Floodplain & Fence Compliance
Exec=xdg-open ${origin}
Terminal=false
Categories=Office;Utility;
`;

  res.setHeader('Content-Type', 'application/x-desktop; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="IndeeCheck.desktop"');
  res.send(content);
});
