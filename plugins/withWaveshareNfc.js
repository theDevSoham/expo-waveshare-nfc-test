const { withAndroidManifest, withPlugins } = require("@expo/config-plugins");

const withNfcPermission = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;

    // 1. Add NFC Permissions
    const permissions = androidManifest["uses-permission"] || [];
    if (
      !permissions.find((p) => p.$["android:name"] === "android.permission.NFC")
    ) {
      permissions.push({ $: { "android:name": "android.permission.NFC" } });
    }
    androidManifest["uses-permission"] = permissions;

    // 2. Add NFC Hardware Feature
    const features = androidManifest["uses-feature"] || [];
    if (!features.find((f) => f.$["android:name"] === "android.hardware.nfc")) {
      features.push({
        $: {
          "android:name": "android.hardware.nfc",
          "android:required": "true",
        },
      });
    }
    androidManifest["uses-feature"] = features;

    // 3. Configure MainActivity
    const mainActivity = androidManifest.application[0].activity.find(
      (a) => a.$["android:name"] === ".MainActivity",
    );

    if (mainActivity) {
      mainActivity["intent-filter"] = mainActivity["intent-filter"] || [];

      // Helper to prevent duplicate intent filters
      const addIntentFilter = (actionName, data = null) => {
        const exists = mainActivity["intent-filter"].some((filter) =>
          filter.action?.some((a) => a.$["android:name"] === actionName),
        );

        if (!exists) {
          const newFilter = {
            action: [{ $: { "android:name": actionName } }],
            category: [
              { $: { "android:name": "android.intent.category.DEFAULT" } },
            ],
          };
          if (data) newFilter.data = [data];
          mainActivity["intent-filter"].push(newFilter);
        }
      };

      // Add the specific "Trap" filters
      addIntentFilter("android.nfc.action.TAG_DISCOVERED");
      addIntentFilter("android.nfc.action.TECH_DISCOVERED");
      addIntentFilter("android.nfc.action.NDEF_DISCOVERED", {
        $: {
          "android:scheme": "vnd.android.nfc",
          "android:host": "ext",
          "android:pathPrefix": "/waveshare.feng.nfctag:pkg",
        },
      });

      // 4. Add the TECH_DISCOVERED meta-data
      mainActivity["meta-data"] = mainActivity["meta-data"] || [];
      const hasMetaData = mainActivity["meta-data"].some(
        (m) => m.$["android:name"] === "android.nfc.action.TECH_DISCOVERED",
      );

      if (!hasMetaData) {
        mainActivity["meta-data"].push({
          $: {
            "android:name": "android.nfc.action.TECH_DISCOVERED",
            "android:resource": "@xml/nfc_tech_list",
          },
        });
      }
    }

    return config;
  });
};

module.exports = (config) => withPlugins(config, [withNfcPermission]);
