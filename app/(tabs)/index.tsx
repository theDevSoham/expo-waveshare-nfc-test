import StidgetWaveshareNfc from "@/modules/@stidget/waveshare-nfc";
import { Asset } from "expo-asset";
import * as ImageManipulator from "expo-image-manipulator";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import NfcManager, { NfcTech } from "react-native-nfc-manager";

const HomeScreen = () => {
  const [status, setStatus] = useState("Ready to Flash");
  const [progress, setProgress] = useState(0);

  // Set up the listener for the SDK's internal progress variable 'c'
  useEffect(() => {
    const subscription = StidgetWaveshareNfc.addListener(
      "onProgress",
      (event: { progress: number }) => {
        setProgress(event.progress);
      },
    );

    return () => subscription.remove();
  }, []);

  const processAndFlash = async (tag: any) => {
    try {
      setStatus("Processing License...");

      // 1. Load baked-in PNG asset
      const asset = Asset.fromModule(require("@/assets/images/License.png"));
      await asset.downloadAsync();

      // 2. Prepare the 264x176 bitmap
      const context = ImageManipulator.useImageManipulator(
        asset.localUri || asset.uri,
      );
      context.resize({ width: 264, height: 176 });

      const result = await context.renderAsync();
      const saveResult = await result.saveAsync({
        base64: true,
        format: ImageManipulator.SaveFormat.PNG,
      });

      if (saveResult.base64) {
        setStatus("Flashing... Hold Steady");

        // 3. Trigger native flash.
        // Note: SDK handles 270° rotation and "WSDZ10m" header check internally
        const success = await StidgetWaveshareNfc.flashImage(
          saveResult.base64,
          tag,
        );

        if (success) {
          Alert.alert("Success", "License Disc Updated!");
        } else {
          Alert.alert(
            "Error",
            "Flash interrupted. Ensure badge stays touching phone.",
          );
        }
      }
    } catch (error) {
      console.error("Image processing error:", error);
      Alert.alert("Error", "Runtime image processing failed.");
    }
  };

  const startNfcDiscovery = async () => {
    try {
      setProgress(0);
      setStatus("Scanning... Hold badge to phone");

      // Request NfcA technology as required by the Waveshare chip
      await NfcManager.requestTechnology(NfcTech.NfcA);
      const tag = await NfcManager.getTag();

      if (tag) {
        // Run the combined processing and flashing logic
        await processAndFlash(tag);
      }
    } catch (ex) {
      console.warn("NFC Error:", ex);
      setStatus("Retry Scan");
    } finally {
      // Clean up NFC session
      NfcManager.cancelTechnologyRequest();
      setStatus("Ready to Flash");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Waveshare 2.7" Controller</Text>

      <TouchableOpacity
        style={[styles.button, progress > 0 && styles.disabledButton]}
        onPress={startNfcDiscovery}
        disabled={progress > 0}
      >
        <Text style={styles.buttonText}>
          {progress > 0 ? `Flashing: ${progress}%` : status}
        </Text>
      </TouchableOpacity>

      {progress > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.warning}>⚠️ DO NOT MOVE PHONE</Text>
        </View>
      )}
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 30,
    color: "#333",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: "#A2A2A2",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  progressContainer: {
    marginTop: 30,
    width: "80%",
    alignItems: "center",
  },
  progressBarBackground: {
    width: "100%",
    height: 10,
    backgroundColor: "#E0E0E0",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4CD964",
  },
  warning: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "bold",
  },
});
