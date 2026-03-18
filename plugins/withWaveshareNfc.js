const { withAndroidManifest, withPlugins } = require("@expo/config-plugins");

const withNfcPermission = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    // 1. Add NFC Permissions
    if (!androidManifest["uses-permission"]) {
      androidManifest["uses-permission"] = [];
    }
    if (
      !androidManifest["uses-permission"].find(
        (p) => p.$["android:name"] === "android.permission.NFC",
      )
    ) {
      androidManifest["uses-permission"].push({
        $: { "android:name": "android.permission.NFC" },
      });
    }

    // 2. Add NFC Hardware Feature requirement
    if (!androidManifest["uses-feature"]) {
      androidManifest["uses-feature"] = [];
    }
    if (
      !androidManifest["uses-feature"].find(
        (f) => f.$["android:name"] === "android.hardware.nfc",
      )
    ) {
      androidManifest["uses-feature"].push({
        $: {
          "android:name": "android.hardware.nfc",
          "android:required": "true",
        },
      });
    }

    // 3. Add the Intent Filter to the MainActivity to "catch" the badge
    const mainActivity = androidManifest.application[0].activity.find(
      (a) => a.$["android:name"] === ".MainActivity",
    );

    if (mainActivity) {
      if (!mainActivity["intent-filter"]) {
        mainActivity["intent-filter"] = [];
      }
      mainActivity["intent-filter"].push({
        action: [
          { $: { "android:name": "android.nfc.action.TAG_DISCOVERED" } },
        ],
        category: [
          { $: { "android:name": "android.intent.category.DEFAULT" } },
        ],
      });
    }

    return config;
  });
};

module.exports = (config) => withPlugins(config, [withNfcPermission]);
