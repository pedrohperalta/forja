#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE_NAME="forja-apk-builder"
ARTIFACT_TYPE="${1:-apk}"
OUTPUT_DIR="${2:-$SCRIPT_DIR/build-output}"
API_URL="${EXPO_PUBLIC_FORJA_API_URL:-https://forja.phperalta.me}"
ANDROID_ARCHITECTURES="${ANDROID_ARCHITECTURES:-arm64-v8a}"

if [ "$ARTIFACT_TYPE" != "apk" ] && [ "$ARTIFACT_TYPE" != "aab" ]; then
  echo "Usage: $0 [apk|aab] [output-dir]" >&2
  exit 2
fi

echo "=== Forja APK Builder ==="
echo "Project: $SCRIPT_DIR"
echo "Artifact: $ARTIFACT_TYPE"
echo "Output:  $OUTPUT_DIR"
echo "API URL: $API_URL"
echo "Android architectures: $ANDROID_ARCHITECTURES"
echo ""

mkdir -p "$OUTPUT_DIR"

# Build via BuildKit (required for cache mounts that persist deps across builds)
echo "Building APK via Docker (this may take a while on first run)..."
docker buildx build \
  --load \
  --build-arg "ARTIFACT_TYPE=$ARTIFACT_TYPE" \
  --build-arg "EXPO_PUBLIC_FORJA_API_URL=$API_URL" \
  --build-arg "ANDROID_ARCHITECTURES=$ANDROID_ARCHITECTURES" \
  -f "$SCRIPT_DIR/build-apk.Dockerfile" \
  -t "$IMAGE_NAME" \
  "$SCRIPT_DIR"

# Extract the APK from the scratch image
CONTAINER_ID=$(docker create "$IMAGE_NAME" "/app-release.$ARTIFACT_TYPE")
VERSION=$(node -e "console.log(require('$SCRIPT_DIR/mobile/app.json').expo.version)")
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARTIFACT_NAME="forja-v${VERSION}-${TIMESTAMP}.${ARTIFACT_TYPE}"

docker cp "$CONTAINER_ID:/app-release.$ARTIFACT_TYPE" "$OUTPUT_DIR/$ARTIFACT_NAME"
docker rm "$CONTAINER_ID" > /dev/null

echo ""
echo "Android artifact built successfully: $OUTPUT_DIR/$ARTIFACT_NAME"
echo "$OUTPUT_DIR/$ARTIFACT_NAME"
