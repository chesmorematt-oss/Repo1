#!/usr/bin/env node
/**
 * Local Desktop Shortcut Installer for IndeeCheck
 * Run via: npm run install:desktop
 *
 * Creates a Desktop launcher icon on Windows (.lnk with indeecheck.ico),
 * macOS (IndeeCheck.app with custom icon), or Linux (IndeeCheck.desktop)
 * that starts the local IndeeCheck server (if not already running) and opens
 * the app in a standalone desktop window.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const desktopDir = path.join(os.homedir(), 'Desktop');
const icoPath = path.join(repoRoot, 'public', 'indeecheck.ico');
const pngPath = path.join(repoRoot, 'public', 'icons', 'icon-512.png');
const targetUrl = process.env.INDEECHECK_URL || 'http://localhost:3000';

if (!fs.existsSync(desktopDir)) {
  fs.mkdirSync(desktopDir, { recursive: true });
}

const platform = os.platform();

if (platform === 'win32') {
  // Create a local helper .vbs/.bat runner so the server starts silently in the background if needed
  const runnerBat = path.join(repoRoot, 'scripts', 'launch-indeecheck-win.bat');
  const batContent = [
    '@echo off',
    `cd /d "${repoRoot}"`,
    'powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri \'http://127.0.0.1:3000/api/health\' -TimeoutSec 1 -UseBasicParsing } catch { Start-Process -WindowStyle Hidden -FilePath \'npm.cmd\' -ArgumentList \'run\',\'dev\' -WorkingDirectory \'' +
      repoRoot.replace(/'/g, "''") +
      '\'; Start-Sleep -Seconds 3 }"',
    'if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (',
    `  start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app=${targetUrl}`,
    ') else if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (',
    `  start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app=${targetUrl}`,
    ') else if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (',
    `  start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app=${targetUrl}`,
    ') else (',
    `  start "" "${targetUrl}"`,
    ')',
  ].join('\r\n');
  fs.writeFileSync(runnerBat, batContent, 'utf8');

  const shortcutPath = path.join(desktopDir, 'IndeeCheck - Planning & Zoning.lnk');
  const psScript = `
    $wsh = New-Object -ComObject WScript.Shell
    $lnk = $wsh.CreateShortcut('${shortcutPath.replace(/'/g, "''")}')
    $lnk.TargetPath = '${runnerBat.replace(/'/g, "''")}'
    $lnk.WorkingDirectory = '${repoRoot.replace(/'/g, "''")}'
    $lnk.IconLocation = '${icoPath.replace(/'/g, "''")},0'
    $lnk.WindowStyle = 7
    $lnk.Description = 'City of Independence, IA Planning, Zoning, Floodplain & Fence Compliance'
    $lnk.Save()
  `;
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript], {
    stdio: 'inherit',
  });
  console.log(`Created Windows Desktop shortcut with icon:\n  ${shortcutPath}`);
} else if (platform === 'darwin') {
  const appPath = path.join(desktopDir, 'IndeeCheck.app');
  fs.mkdirSync(path.join(appPath, 'Contents', 'MacOS'), { recursive: true });
  fs.mkdirSync(path.join(appPath, 'Contents', 'Resources'), { recursive: true });

  fs.writeFileSync(
    path.join(appPath, 'Contents', 'Info.plist'),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>IndeeCheck</string>
  <key>CFBundleIdentifier</key><string>gov.independenceia.indeecheck</string>
  <key>CFBundleName</key><string>IndeeCheck</string>
  <key>CFBundleDisplayName</key><string>IndeeCheck — Planning &amp; Zoning</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
</dict>
</plist>`
  );

  const launcher = path.join(appPath, 'Contents', 'MacOS', 'IndeeCheck');
  fs.writeFileSync(
    launcher,
    `#!/bin/bash
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if ! curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
  cd "${repoRoot}" && nohup npm run dev >/tmp/indeecheck.log 2>&1 &
  sleep 2
fi
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="${targetUrl}"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "Microsoft Edge" --args --app="${targetUrl}"
else
  open "${targetUrl}"
fi
`
  );
  fs.chmodSync(launcher, 0o755);

  try {
    const tmpIconset = fs.mkdtempSync(path.join(os.tmpdir(), 'indeecheck-icns-'));
    const iconsetDir = path.join(tmpIconset, 'AppIcon.iconset');
    fs.mkdirSync(iconsetDir);
    for (const sz of [16, 32, 128, 256, 512]) {
      execSync(`sips -z ${sz} ${sz} "${pngPath}" --out "${iconsetDir}/icon_${sz}x${sz}.png"`, {
        stdio: 'ignore',
      });
    }
    execSync(
      `iconutil -c icns "${iconsetDir}" -o "${path.join(appPath, 'Contents', 'Resources', 'AppIcon.icns')}"`,
      { stdio: 'ignore' }
    );
    fs.rmSync(tmpIconset, { recursive: true, force: true });
  } catch {
    // Fallback if iconutil unavailable
  }
  console.log(`Created macOS Desktop application with icon:\n  ${appPath}`);
} else {
  const desktopFile = path.join(desktopDir, 'IndeeCheck.desktop');
  const launcherSh = path.join(repoRoot, 'scripts', 'launch-indeecheck-linux.sh');
  fs.writeFileSync(
    launcherSh,
    `#!/usr/bin/env bash
if ! curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
  cd "${repoRoot}" && nohup npm run dev >/tmp/indeecheck.log 2>&1 &
  sleep 2
fi
if command -v google-chrome >/dev/null 2>&1; then
  google-chrome --app="${targetUrl}" &
elif command -v chromium >/dev/null 2>&1; then
  chromium --app="${targetUrl}" &
else
  xdg-open "${targetUrl}" &
fi
`
  );
  fs.chmodSync(launcherSh, 0o755);

  fs.writeFileSync(
    desktopFile,
    `[Desktop Entry]
Version=1.0
Type=Application
Name=IndeeCheck — Planning & Zoning
Comment=City of Independence, IA Planning, Zoning, Floodplain & Fence Compliance
Exec=${launcherSh}
Icon=${pngPath}
Terminal=false
Categories=Office;Utility;
`
  );
  fs.chmodSync(desktopFile, 0o755);
  console.log(`Created Desktop launcher with icon:\n  ${desktopFile}`);
}
