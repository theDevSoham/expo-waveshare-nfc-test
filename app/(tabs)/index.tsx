import StidgetWaveshareNfc from "@/modules/@stidget/waveshare-nfc";
import * as Sentry from "@sentry/react-native";
import { Asset } from "expo-asset";
import * as ImageManipulator from "expo-image-manipulator";
import React, { useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const HomeScreen = () => {
  const [status, setStatus] = useState("Ready to Flash");
  const [progress, setProgress] = useState(0);
  const pollingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const processAndFlash = async () => {
    try {
      // --- 1. PRE-PROCESSING (Do this before asking user to tap) ---
      setStatus("Downloading Image...");
      const remoteUri =
        "https://placehold.co/264x176/000000/FFFFFF/png?text=NFC+TEST";
      const IMAGE = Asset.fromURI(remoteUri);
      const downloadedImage = await IMAGE.downloadAsync();

      setStatus("Processing...");
      const result = await ImageManipulator.ImageManipulator.manipulate(
        downloadedImage.localUri || downloadedImage.uri,
      )
        .resize({ width: 264, height: 176 })
        .renderAsync();

      const saveResult = await result.saveAsync({
        base64: true,
        format: ImageManipulator.SaveFormat.PNG,
      });

      if (!saveResult.base64) throw new Error("Base64 generation failed");

      // --- 2. HARDWARE ENGAGEMENT ---
      setStatus("Ready! Tap badge to phone"); // User sees this and knows to touch the tag
      startPolling();

      Sentry.addBreadcrumb({
        category: "native",
        message: "Invoking startScanAndFlash",
      });

      // This call will stay 'pending' until a tag is physically touched to the phone
      const success = await StidgetWaveshareNfc.startScanAndFlash(
        saveResult.base64,
      );

      if (success) {
        setProgress(100);
        Alert.alert("Success", "Image Updated!");
      } else {
        Alert.alert("Error", "Flash returned false. Check hardware alignment.");
      }
    } catch (error: any) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Flash failed:", message);

      Sentry.captureException(error, {
        extra: { nativeErrorMessage: message },
      });

      Alert.alert("Flash Failed", message);
    } finally {
      stopPolling();
      setStatus("Ready to Flash");
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
        onPress={processAndFlash}
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
