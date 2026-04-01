const { withMainActivity } = require("@expo/config-plugins");

module.exports = (config) => {
  return withMainActivity(config, (config) => {
    const mainActivity = config.modResults;
    let contents = mainActivity.contents;

    // 1. Better Import Injection
    // Instead of looking for package, we inject at the very top if missing
    if (!contents.includes("import android.content.Intent")) {
      const importBlock = `import android.content.Intent\nimport android.nfc.NfcAdapter\n`;
      // Insert after the package line
      contents = contents.replace(/(package [\w.]+)/, `$1\n\n${importBlock}`);
    }

    // 2. Updated Signature to match the "Potential signatures" from your error log
    // We use Intent! to match the Platform Type expected by the compiler
    const onNewIntentCode = `
  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
  }
`;

    // 3. Prevent duplicate injection if you run prebuild multiple times
    if (!contents.includes("override fun onNewIntent")) {
      // Find the last closing brace of the class and insert before it
      contents = contents.replace(/(\n}\s*$)/, `\n${onNewIntentCode}$1`);
    }

    mainActivity.contents = contents;
    return config;
  });
};
