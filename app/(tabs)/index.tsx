import StidgetWaveshareNfc from "@/modules/@stidget/waveshare-nfc";
import { Asset } from "expo-asset";
import * as ImageManipulator from "expo-image-manipulator";
import React, { useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import NfcManager, { NfcTech } from "react-native-nfc-manager";

const HomeScreen = () => {
  const [status, setStatus] = useState("Ready to Flash");
  const [progress, setProgress] = useState(0);
  const pollingInterval = useRef<number | null>(null);

  // Helper to start polling the native getProgress() method
  const startPolling = () => {
    setProgress(0);
    pollingInterval.current = setInterval(() => {
      const currentProgress = StidgetWaveshareNfc.getProgress();

      // Update UI if progress has changed
      if (currentProgress >= 0) {
        setProgress(currentProgress);
      }

      // Stop polling if we reach completion or an error state (-1)
      if (currentProgress >= 100 || currentProgress === -1) {
        stopPolling();
      }
    }, 100); // Poll every 100ms
  };

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  const processAndFlash = async (tag: any) => {
    try {
      setStatus("Processing License...");

      const asset = Asset.fromModule(require("@/assets/images/License.png"));
      await asset.downloadAsync();

      const context = ImageManipulator.useImageManipulator(
        asset.localUri || asset.uri,
      );
      context.resize({ width: 264, height: 176 }); // Exact Type 6 resolution

      const result = await context.renderAsync();
      const saveResult = await result.saveAsync({
        base64: true,
        format: ImageManipulator.SaveFormat.PNG,
      });

      if (saveResult.base64) {
        setStatus("Flashing... Hold Steady");

        // Start polling right before the heavy native call
        startPolling();

        const success = await StidgetWaveshareNfc.flashImage(
          saveResult.base64,
          tag,
        );

        if (success) {
          setProgress(100);
          Alert.alert("Success", "License Disc Updated!");
        } else {
          Alert.alert("Error", "Flash interrupted or header mismatch.");
        }
      }
    } catch (error) {
      console.error("Image processing error:", error);
      Alert.alert("Error", "Runtime image processing failed.");
    } finally {
      stopPolling();
      setStatus("Ready to Flash");
    }
  };

  const startNfcDiscovery = async () => {
    try {
      setStatus("Scanning... Hold badge to phone");
      await NfcManager.requestTechnology(NfcTech.NfcA);
      const tag = await NfcManager.getTag();

      if (tag) {
        await processAndFlash(tag);
      }
    } catch (ex) {
      console.warn("NFC Error:", ex);
      setStatus("Retry Scan");
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Waveshare 2.7" Controller</Text>

      <TouchableOpacity
        style={[
          styles.button,
          progress > 0 && progress < 100 && styles.disabledButton,
        ]}
        onPress={startNfcDiscovery}
        disabled={progress > 0 && progress < 100}
      >
        <Text style={styles.buttonText}>
          {progress > 0 && progress < 100 ? `Flashing: ${progress}%` : status}
        </Text>
      </TouchableOpacity>

      {progress > 0 && progress < 100 && (
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
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 30, color: "#333" },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  disabledButton: { backgroundColor: "#A2A2A2" },
  buttonText: { color: "white", fontSize: 16, fontWeight: "700" },
  progressContainer: { marginTop: 30, width: "80%", alignItems: "center" },
  progressBarBackground: {
    width: "100%",
    height: 10,
    backgroundColor: "#E0E0E0",
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: { height: "100%", backgroundColor: "#4CD964" },
  warning: { color: "#FF3B30", fontSize: 14, fontWeight: "bold" },
});
