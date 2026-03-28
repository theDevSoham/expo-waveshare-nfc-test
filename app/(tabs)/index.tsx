import StidgetWaveshareNfc from "@/modules/@stidget/waveshare-nfc";
import * as Sentry from "@sentry/react-native";
import { Asset } from "expo-asset";
import * as ImageManipulator from "expo-image-manipulator";
import React, { useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import NfcManager, { NfcTech } from "react-native-nfc-manager";

const IMAGE = Asset.fromModule(require("@/assets/images/test.png"));

const HomeScreen = () => {
  const [status, setStatus] = useState("Ready to Flash");
  const [progress, setProgress] = useState(0);
  const pollingInterval = useRef<number | null>(null);
  const context = ImageManipulator.useImageManipulator(IMAGE.uri);

  const startPolling = () => {
    setProgress(0);
    Sentry.addBreadcrumb({
      category: "nfc",
      message: "Starting progress polling",
    });

    pollingInterval.current = setInterval(() => {
      try {
        const currentProgress = StidgetWaveshareNfc.getProgress();
        if (currentProgress >= 0) setProgress(currentProgress);

        if (currentProgress === -1) {
          Sentry.captureMessage(
            "NFC Hardware reported failure state (-1)",
            "warning",
          );
          stopPolling();
        } else if (currentProgress >= 100) {
          stopPolling();
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { area: "polling" } });
        stopPolling();
      }
    }, 100);
  };

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };

  const processAndFlash = async (tag: any) => {
    Sentry.setContext("nfc_tag", { tag_info: tag });

    try {
      setStatus("Processing License...");
      Sentry.addBreadcrumb({
        category: "image",
        message: "Starting manipulation",
      });

      context.resize({ width: 264, height: 176 });
      const result = await context.renderAsync();
      const saveResult = await result.saveAsync({
        base64: true,
        format: ImageManipulator.SaveFormat.PNG,
      });

      if (!saveResult.base64) {
        throw new Error("Base64 generation failed");
      }

      setStatus("Flashing... Hold Steady");
      startPolling();

      Sentry.addBreadcrumb({
        category: "native",
        message: "Invoking flashImage",
      });
      const success = await StidgetWaveshareNfc.flashImage(
        saveResult.base64,
        tag,
      );

      if (success) {
        setProgress(100);
        Sentry.captureMessage("Flash successful", "info");
        Alert.alert("Success", "License Disc Updated!");
      } else {
        Sentry.captureMessage(
          "flashImage returned false (likely hardware mismatch)",
          "error",
        );
        Alert.alert("Error", "Flash interrupted or header mismatch.");
      }
    } catch (error) {
      Sentry.captureException(error, {
        extra: { status, progress },
        tags: { section: "image_processing" },
      });
      Alert.alert("Error", "Runtime image processing failed.");
    } finally {
      stopPolling();
      setStatus("Ready to Flash");
    }
  };

  const startNfcDiscovery = async () => {
    Sentry.addBreadcrumb({
      category: "ui",
      message: "User triggered NFC scan",
    });
    try {
      setStatus("Scanning... Hold badge to phone");

      // Attempt to request technology
      await NfcManager.requestTechnology(NfcTech.NfcA);
      const tag = await NfcManager.getTag();

      if (tag) {
        Sentry.addBreadcrumb({
          category: "nfc",
          message: "Tag discovered successfully",
        });
        await processAndFlash(tag);
      } else {
        Sentry.captureMessage(
          "NFC session started but no tag was captured",
          "warning",
        );
        Alert.alert("Warning", "Tag not found");
      }
    } catch (ex: any) {
      // Check if user just cancelled the session (common "error")
      if (ex?.toString().includes("User cancel")) {
        Sentry.addBreadcrumb({
          category: "nfc",
          message: "User cancelled NFC session",
        });
      } else {
        Sentry.captureException(ex, { tags: { area: "nfc_discovery" } });
      }
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
