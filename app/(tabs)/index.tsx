import StidgetWaveshareNfc from "@/modules/@stidget/waveshare-nfc";
import {
  EPaperDimensions,
  EPaperType,
} from "@/modules/@stidget/waveshare-nfc/src/Constants";
import { useEvent } from "expo";
import * as ImageManipulator from "expo-image-manipulator";
import React, { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const HomeScreen = () => {
  const [status, setStatus] = useState("Ready to Flash");
  const [progress, setProgress] = useState(0);

  // Note: Your custom Kotlin module is currently hardcoded for 2.13" 250x122
  const config = EPaperDimensions[EPaperType.INCH_2_13];

  const event = useEvent(StidgetWaveshareNfc, "onProgressUpdate");

  useEffect(() => {
    if (event) {
      setProgress(event.progress);
    }
  }, [event]);

  const processAndFlash = async () => {
    try {
      setStatus("Preparing Image...");

      // 1. Image Processing
      const uri = `https://placehold.co/${config.width}x${config.height}/000000/FFFFFF/png?text=HELLO+WORLD`;

      const result = await ImageManipulator.ImageManipulator.manipulate(uri)
        .resize({ width: config.width, height: config.height })
        .renderAsync();

      const saveResult = await result.saveAsync({
        base64: true,
        format: ImageManipulator.SaveFormat.PNG,
      });

      if (!saveResult.base64) throw new Error("Base64 generation failed");

      // 2. Hardware Engagement
      setProgress(0);
      setStatus("READY: Tap and HOLD badge");

      // CALLING THE NEW CUSTOM MODULE FUNCTION
      const success = await StidgetWaveshareNfc.flashImage(saveResult.base64);

      if (success) {
        setProgress(100);
        Alert.alert("Success", "E-Paper Updated!");
      }
    } catch (error: any) {
      console.error("Flash failed:", error.message);
      Alert.alert("Flash Failed", error.message);
      setProgress(0);
    } finally {
      setStatus("Ready to Flash");
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Stidget Custom NFC</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Target: 2.13" (250 x 122)</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            progress > 0 && progress < 100 && styles.disabledButton,
          ]}
          onPress={processAndFlash}
          disabled={progress > 0 && progress < 100}
        >
          <Text style={styles.buttonText}>
            {progress > 0 && progress < 100 ? `Writing: ${progress}%` : status}
          </Text>
        </TouchableOpacity>

        {progress > 0 && progress < 100 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View
                style={[styles.progressBarFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.warning}>⚠️ KEEP DEVICE TOUCHING TAG</Text>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
};

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
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    // Add simple shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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

  sectionLabel: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 10,
    alignSelf: "flex-start",
  },
  selectorContainer: { height: 50, marginBottom: 20 },
  scrollContent: { paddingHorizontal: 5 },
  chip: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  selectedChip: { backgroundColor: "#007AFF", borderColor: "#007AFF" },
  disabledChip: { opacity: 0.5 },
  chipText: { color: "#495057", fontWeight: "600" },
  selectedChipText: { color: "white" },
  infoBox: {
    marginBottom: 30,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 1,
  },
  infoText: { color: "#495057", fontStyle: "italic" },
});
