const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Config plugin that patches expo-image-picker's ImageLibraryContract
 * to wrap the legacy ACTION_GET_CONTENT intent in Intent.createChooser().
 *
 * On Android 13+, ACTION_GET_CONTENT with image/* is intercepted by the
 * system photo picker (Google Photos). Wrapping in createChooser() forces
 * the OS to show the app chooser dialog so the user can pick their
 * preferred gallery app.
 */
function withLegacyImagePickerChooser(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const contractPath = path.join(
        config.modRequest.projectRoot,
        "node_modules",
        "expo-image-picker",
        "android",
        "src",
        "main",
        "java",
        "expo",
        "modules",
        "imagepicker",
        "contracts",
        "ImageLibraryContract.kt"
      );

      let contents = fs.readFileSync(contractPath, "utf-8");

      // Only patch if not already patched
      if (contents.includes("Intent.createChooser")) {
        return config;
      }

      // Replace the entire createLegacyIntent function with a version
      // that wraps the intent in Intent.createChooser()
      const originalFn =
        "private fun createLegacyIntent(options: ImagePickerOptions) = Intent(Intent.ACTION_GET_CONTENT)\n" +
        '    .addCategory(Intent.CATEGORY_OPENABLE)\n' +
        '    .setType("*/*")\n' +
        "    .putExtra(\n" +
        "      Intent.EXTRA_MIME_TYPES,\n" +
        "      when (options.nativeMediaTypes) {\n" +
        '        MediaTypes.IMAGES -> arrayOf("image/*")\n' +
        '        MediaTypes.VIDEOS -> arrayOf("video/*")\n' +
        '        else -> arrayOf("image/*", "video/*")\n' +
        "      }\n" +
        "    ).apply {\n" +
        "      if (options.allowsMultipleSelection) {\n" +
        "        putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)\n" +
        "      }\n" +
        "    }";

      const patchedFn =
        "private fun createLegacyIntent(options: ImagePickerOptions) = Intent.createChooser(\n" +
        "    Intent(Intent.ACTION_GET_CONTENT)\n" +
        '      .addCategory(Intent.CATEGORY_OPENABLE)\n' +
        '      .setType("*/*")\n' +
        "      .putExtra(\n" +
        "        Intent.EXTRA_MIME_TYPES,\n" +
        "        when (options.nativeMediaTypes) {\n" +
        '          MediaTypes.IMAGES -> arrayOf("image/*")\n' +
        '          MediaTypes.VIDEOS -> arrayOf("video/*")\n' +
        '          else -> arrayOf("image/*", "video/*")\n' +
        "        }\n" +
        "      ).apply {\n" +
        "        if (options.allowsMultipleSelection) {\n" +
        "          putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)\n" +
        "        }\n" +
        '      },\n' +
        '    ""\n' +
        "  )";

      if (!contents.includes(originalFn)) {
        console.warn(
          "[withLegacyImagePickerChooser] Could not find expected code block to patch. " +
          "The expo-image-picker version may have changed."
        );
        return config;
      }

      contents = contents.replace(originalFn, patchedFn);
      fs.writeFileSync(contractPath, contents, "utf-8");

      return config;
    },
  ]);
}

module.exports = withLegacyImagePickerChooser;
