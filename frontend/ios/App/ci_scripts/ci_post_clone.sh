#!/bin/bash
# Xcode Cloud, nach dem Klonen: Web-Build, Capacitor-Sync, Swift-Pakete,
# Build-Nummer und Signierung. Ohne sie fehlen dem Projekt Web-Buendel und
# Plugin-Pakete.
set -euo pipefail

REPO="${CI_PRIMARY_REPOSITORY_PATH:?Nur fuer Xcode Cloud gedacht.}"
FRONTEND="$REPO/frontend"
IOS="$FRONTEND/ios/App"
PBXPROJ="$IOS/App.xcodeproj/project.pbxproj"
RESOLVED="$IOS/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved"

# Die Capacitor-CLI verlangt mindestens Node 22.
export HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1
brew install node@26
NODE_PREFIX=$(brew --prefix node@26)
export PATH="$NODE_PREFIX/bin:$PATH"
[ "$(node -p 'process.versions.node.split(".")[0]')" = 26 ] || { echo "FEHLER: Node 26 erwartet."; exit 1; }

# Xcode Cloud vergibt die Build-Nummer. Sie ersetzt CURRENT_PROJECT_VERSION im
# Projekt, der Versionsquelle des Repos; kleiner als die dort stehende darf sie
# nicht sein.
# shellcheck disable=SC2016
node -e '
const fs = require("fs"); const datei = process.argv[1]; let pbx = fs.readFileSync(datei, "utf8");
const werte = (s) => [...new Set([...pbx.matchAll(new RegExp(s + " = ([^;]*);", "g"))].map((m) => m[1]))];
const version = werte("MARKETING_VERSION"); const alt = werte("CURRENT_PROJECT_VERSION");
if (version.length !== 1 || !/^\d+\.\d+(\.\d+)?$/.test(version[0])) { console.error(`FEHLER: MARKETING_VERSION uneinheitlich oder ungueltig: ${version}`); process.exit(1); }
if (alt.length !== 1 || !/^\d+$/.test(alt[0])) { console.error(`FEHLER: CURRENT_PROJECT_VERSION uneinheitlich oder ungueltig: ${alt}`); process.exit(1); }
const neu = Number(process.env.CI_BUILD_NUMBER);
if (!Number.isInteger(neu) || !(neu > Number(alt[0]))) { console.error(`FEHLER: Xcode-Cloud-Build ${process.env.CI_BUILD_NUMBER} liegt nicht ueber CURRENT_PROJECT_VERSION ${alt[0]}. In App Store Connect unter Xcode Cloud > Settings > Build Number die naechste Nummer hoeher setzen.`); process.exit(1); }
pbx = pbx.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${neu};`); fs.writeFileSync(datei, pbx);
console.log(`Version ${version[0]}, iOS-Build ${neu}`);' "$PBXPROJ"

cd "$FRONTEND"
npm ci --no-audit --no-fund
npm run build
npx cap sync ios

# Xcode Cloud loest Swift-Pakete nicht selbst auf und verlangt eine passende
# Package.resolved. cap sync kann die Capacitor-Version gerade geaendert haben.
cd "$IOS"
xcodebuild -resolvePackageDependencies -project App.xcodeproj -scheme App
[ -f "$RESOLVED" ] || { echo "FEHLER: Package.resolved fehlt nach der Paketaufloesung."; exit 1; }

# Xcode Cloud signiert selbst und braucht dafuer automatisches Signieren. Die
# Release-Konfiguration bleibt fest auf Profil und Distribution-Zertifikat, damit
# Xcode anderswo keine Zertifikate anlegt; hier wird sie nur im Klon umgestellt.
for paar in 'CODE_SIGN_STYLE = Manual;:1' 'CODE_SIGN_IDENTITY = "Apple Distribution";:2' 'PROVISIONING_PROFILE_SPECIFIER = "Fahrtenbuch AppStore";:1'; do
  zeile="${paar%:*}"; soll="${paar##*:}"
  [ "$(grep -cF "$zeile" "$PBXPROJ")" = "$soll" ] || { echo "FEHLER: '$zeile' steht nicht genau ${soll}-mal in project.pbxproj."; exit 1; }
done
sed -i '' \
  -e 's/CODE_SIGN_STYLE = Manual;/CODE_SIGN_STYLE = Automatic;/' \
  -e 's/CODE_SIGN_IDENTITY = "Apple Distribution";/CODE_SIGN_IDENTITY = "Apple Development";/' \
  -e 's/PROVISIONING_PROFILE_SPECIFIER = "Fahrtenbuch AppStore";/PROVISIONING_PROFILE_SPECIFIER = "";/' \
  "$PBXPROJ"
echo "Signieren fuer Xcode Cloud auf automatisch gestellt."
