# syntax=docker/dockerfile:1.7
FROM reactnativecommunity/react-native-android:v20.1 AS builder

ARG ARTIFACT_TYPE=apk
ARG EXPO_PUBLIC_FORJA_API_URL=https://forja.phperalta.me
ARG ANDROID_ARCHITECTURES=arm64-v8a
ENV NODE_ENV=production
ENV EXPO_PUBLIC_FORJA_API_URL=${EXPO_PUBLIC_FORJA_API_URL}
ENV ANDROID_ARCHITECTURES=${ANDROID_ARCHITECTURES}

WORKDIR /app

RUN npm install -g pnpm@10.24.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY mobile/package.json mobile/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY web/package.json web/package.json

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

WORKDIR /app/mobile
RUN npx expo prebuild --platform android --clean

# Restrict native compilation to arm64-v8a to keep local VPS builds smaller.
RUN python3 -c "\
import re, pathlib; \
p = pathlib.Path('android/app/build.gradle'); \
s = p.read_text(); \
p.write_text(re.sub(r'(defaultConfig \\{\\n)', r'\\1        ndk { abiFilters \"arm64-v8a\" }\\n', s, count=1))"

WORKDIR /app/mobile/android
RUN --mount=type=cache,target=/root/.gradle,sharing=locked \
    --mount=type=cache,target=/app/mobile/android/.gradle,sharing=locked \
    --mount=type=cache,target=/app/mobile/android/.cxx,sharing=locked \
    --mount=type=cache,target=/app/mobile/android/app/build,sharing=locked \
    if [ "$ARTIFACT_TYPE" = "aab" ]; then \
      ./gradlew bundleRelease --no-daemon --max-workers=2 -PreactNativeArchitectures="$ANDROID_ARCHITECTURES" -Dorg.gradle.jvmargs="-Xmx4g" && \
      mkdir -p /output && \
      cp /app/mobile/android/app/build/outputs/bundle/release/app-release.aab /output/app-release.aab; \
    else \
      ./gradlew assembleRelease --no-daemon --max-workers=2 -PreactNativeArchitectures="$ANDROID_ARCHITECTURES" -Dorg.gradle.jvmargs="-Xmx4g" && \
      mkdir -p /output && \
      cp /app/mobile/android/app/build/outputs/apk/release/app-release.apk /output/app-release.apk; \
    fi

FROM scratch
ARG ARTIFACT_TYPE=apk
COPY --from=builder /output/app-release.${ARTIFACT_TYPE} /app-release.${ARTIFACT_TYPE}
