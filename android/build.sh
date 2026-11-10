#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD="${BUILD_DIR:-$ROOT/build}"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-/usr/local/lib/android/sdk}}"
BT_VER="${BUILD_TOOLS_VERSION:-34.0.0}"
BT="$SDK/build-tools/$BT_VER"
ANDROID_JAR="${ANDROID_JAR:-$SDK/platforms/android-34/android.jar}"

export PATH="$BT:$PATH"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"

KEYSTORE="$BUILD/release.keystore"
KS_PASS="${KS_PASS:-release123}"
KEY_ALIAS="${KEY_ALIAS:-release}"
APK_NAME="${APK_NAME:-notes.apk}"

WEB_DIST="${WEB_DIST:-$ROOT/../web/dist}"

rm -rf "$BUILD/classes" "$BUILD/dex" "$BUILD/apk" "$BUILD/assets"
mkdir -p "$BUILD/classes" "$BUILD/dex" "$BUILD/apk" "$BUILD/assets/assets"

cp "$WEB_DIST/index.html" "$BUILD/assets/assets/index.html"

echo "==> aapt (resources + R.java)"
aapt package -f -m -J "$BUILD/classes" -S "$ROOT/src/main/res" \
    -M "$ROOT/src/main/AndroidManifest.xml" -I "$ANDROID_JAR"

echo "==> javac"
javac -source 8 -target 8 -nowarn -classpath "$ANDROID_JAR" \
    -d "$BUILD/classes" \
    "$ROOT/src/main/java/com/test1/notes/MainActivity.java" \
    "$BUILD/classes/com/test1/notes/R.java"

echo "==> d8 (dex)"
d8 --release --min-api 21 --lib "$ANDROID_JAR" \
    --output "$BUILD/dex" "$BUILD"/classes/com/test1/notes/*.class

echo "==> aapt package (apk)"
aapt package -f -M "$ROOT/src/main/AndroidManifest.xml" -S "$ROOT/src/main/res" \
    -I "$ANDROID_JAR" -F "$BUILD/apk/app_unsigned.apk"

echo "==> add assets + classes.dex"
( cd "$BUILD/assets" && aapt add "$BUILD/apk/app_unsigned.apk" assets/index.html )
( cd "$BUILD/dex" && aapt add "$BUILD/apk/app_unsigned.apk" classes.dex )

echo "==> zipalign"
zipalign -f 4 "$BUILD/apk/app_unsigned.apk" "$BUILD/apk/app_aligned.apk"

if [ ! -f "$KEYSTORE" ]; then
    echo "==> generate keystore"
    keytool -genkeypair -v -keystore "$KEYSTORE" -alias "$KEY_ALIAS" \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass "$KS_PASS" -keypass "$KS_PASS" \
        -dname "CN=Notes, OU=App, O=Test1, L=City, S=State, C=RU"
fi

echo "==> apksigner"
apksigner sign --ks "$KEYSTORE" --ks-key-alias "$KEY_ALIAS" \
    --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" \
    --out "$BUILD/apk/$APK_NAME" "$BUILD/apk/app_aligned.apk"

echo "==> verify"
apksigner verify -v "$BUILD/apk/$APK_NAME"
unzip -l "$BUILD/apk/$APK_NAME" | grep -E "classes.dex|assets/index.html|AndroidManifest"
ls -la "$BUILD/apk/$APK_NAME"
echo "OK -> $BUILD/apk/$APK_NAME"
