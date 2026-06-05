#!/usr/bin/env bash
# =============================================================================
# Starta Markets — iOS TestFlight ship.  ONE command.
#
#   ./scripts/ship-ios.sh
#
# Builds the mobile web bundle → syncs it into the Capacitor iOS app →
# auto-bumps the build number (always strictly increasing) → archives
# (Release, signed) → exports + uploads to TestFlight via the App Store
# Connect API key. Prints the build number + the exact bump-commit command.
#
# Prereqs (already set up on this Mac):
#   • Xcode + command-line tools
#   • Distribution cert + 'com.mubasher.startamarkets' provisioning profile
#   • App Store Connect API key at ~/.appstoreconnect/private_keys/
#   • frontend/ios/UploadOptions.plist (destination=upload → exports+uploads)
# ITSAppUsesNonExemptEncryption=false ⇒ no export-compliance hold.
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FE="$ROOT/frontend"
PBX="$FE/ios/App/App.xcodeproj/project.pbxproj"
PLIST="$FE/ios/UploadOptions.plist"
KEY="$HOME/.appstoreconnect/private_keys/AuthKey_53QD83W9UK.p8"
KEY_ID="53QD83W9UK"
ISSUER="a3879256-fee1-4421-8369-9206ad76ee1c"

red(){ printf '\033[31m%s\033[0m\n' "$*"; }
grn(){ printf '\033[32m%s\033[0m\n' "$*"; }
die(){ red "✗ $*"; exit 1; }

# --- preflight ---------------------------------------------------------------
command -v xcodebuild >/dev/null || die "xcodebuild not found — install Xcode."
[ -f "$KEY" ]   || die "App Store Connect API key missing: $KEY"
[ -f "$PBX" ]   || die "iOS project not found: $PBX"
[ -f "$PLIST" ] || die "UploadOptions.plist not found: $PLIST"

cd "$FE"

# 1. build mobile bundle (prod API base) + sync into iOS project
grn "▶ Building mobile web bundle…"; npm run --silent build:mobile
grn "▶ Syncing into iOS app (cap sync)…"; npx cap sync ios

# 2. bump build number = max(current+1, today YYYYMMDD) → always increasing
CUR="$(grep -m1 'CURRENT_PROJECT_VERSION' "$PBX" | grep -oE '[0-9]+')"
[ -n "$CUR" ] || die "could not read CURRENT_PROJECT_VERSION."
TODAY="$(date +%Y%m%d)"
NEW="$((CUR + 1))"; [ "$TODAY" -gt "$NEW" ] && NEW="$TODAY"
perl -pi -e "s/(CURRENT_PROJECT_VERSION = )[0-9]+;/\${1}${NEW};/g" "$PBX"
grn "▶ Build number: $CUR → $NEW"

# 3. archive (Release, signed)
ARCH="/tmp/Starta-${NEW}.xcarchive"; rm -rf "$ARCH"
grn "▶ Archiving (Release)… (~3–6 min)"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -archivePath "$ARCH" -destination 'generic/platform=iOS' \
  -skipPackagePluginValidation archive >/tmp/starta-ios-archive.log 2>&1 \
  || { tail -30 /tmp/starta-ios-archive.log; die "archive FAILED — see /tmp/starta-ios-archive.log"; }
grep -q 'ARCHIVE SUCCEEDED' /tmp/starta-ios-archive.log || { tail -30 /tmp/starta-ios-archive.log; die "archive did not succeed."; }

# 4. export + upload to TestFlight (UploadOptions destination=upload)
EXP="/tmp/Starta-export-${NEW}"; rm -rf "$EXP"
grn "▶ Exporting + uploading to TestFlight…"
xcodebuild -exportArchive -archivePath "$ARCH" -exportOptionsPlist "$PLIST" \
  -exportPath "$EXP" -authenticationKeyPath "$KEY" -authenticationKeyID "$KEY_ID" \
  -authenticationKeyIssuerID "$ISSUER" -allowProvisioningUpdates 2>&1 \
  | tee /tmp/starta-ios-upload.log | grep -E 'Progress 100|SUCCEEDED|[Ee]rror' || true
grep -q 'EXPORT SUCCEEDED' /tmp/starta-ios-upload.log || die "upload FAILED — see /tmp/starta-ios-upload.log"

grn "✅ Uploaded build 1.0 (${NEW}) to TestFlight — Apple is processing it (~5–15 min)."
echo "   Then COMMIT the bump (keeps the repo == the shipped build):"
echo "     git add frontend/ios/App/App.xcodeproj/project.pbxproj"
echo "     git commit -m 'chore(ios): bump build number → ${NEW} for TestFlight'"
