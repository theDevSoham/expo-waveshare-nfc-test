import StidgetWaveshareNfc from "@/modules/@stidget/waveshare-nfc";
import {
  EPaperDimensions,
  EPaperType,
} from "@/modules/@stidget/waveshare-nfc/src/Constants";
import { useEvent } from "expo";
import * as ImageManipulator from "expo-image-manipulator";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";

const HomeScreen = () => {
  const [selectedType, setSelectedType] = useState<EPaperType>(
    EPaperType.INCH_2_13,
  );
  const [status, setStatus] = useState("Ready to Flash");
  const [progress, setProgress] = useState(0);

  // Derive config from the selection
  const config = EPaperDimensions[selectedType];

  // useEvent returns the latest payload from the native 'onProgressUpdate' event
  const event = useEvent(StidgetWaveshareNfc, "onProgressUpdate");

  useEffect(() => {
    if (event) {
      setProgress(event.progress);
    }
  }, [event]);

  const processAndFlash = async () => {
    try {
      // --- 1. PRE-PROCESSING (Do this while the phone is still in the user's hand) ---
      setStatus("Preparing Image...");

      // Rule out network issues: Use a static URL or local asset
      const uri = `https://placehold.co/${config.width}x${config.height}/000000/FFFFFF/png?text=TEST+SUCCESS`;

      // Perform all manipulation BEFORE calling the native module
      const result = await ImageManipulator.ImageManipulator.manipulate(uri)
        // IMPORTANT: Remove the "- 50" logic for validation.
        // We want to send the exact dimensions the JAR expects.
        .resize({ width: config.width, height: config.height })
        .renderAsync();

      const saveResult = await result.saveAsync({
        base64: true,
        format: ImageManipulator.SaveFormat.PNG,
      });

      if (!saveResult.base64) throw new Error("Base64 generation failed");

      // --- 2. HARDWARE ENGAGEMENT (The "Point of No Return") ---
      setProgress(0);
      // Use a very clear instruction so the user doesn't tap too early
      setStatus("IMAGE READY: Tap and HOLD badge");

      // We pass the ALREADY prepared base64 string
      const success = await StidgetWaveshareNfc.startScanAndFlash(
        selectedType,
        saveResult.base64,
      );

      if (success) {
        setProgress(100);
        Alert.alert("Success", "Hardware Acknowledged Image");
      } else {
        Alert.alert("Error", "JAR returned failure.");
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
    <GestureHandlerRootView>
      <View style={styles.container}>
        <Text style={styles.title}>Waveshare NFC Controller</Text>

        <Text style={styles.sectionLabel}>Select Your Hardware:</Text>

        {/* 2. Device Selector List */}
        <View style={styles.selectorContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Convert Enum to Numeric Array for proper comparison */}
            {(Object.values(EPaperType) as EPaperType[])
              .filter((v) => typeof v === "number")
              .map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.chip,
                    // Now comparing number to number (e.g., 1 === 1)
                    selectedType === type && styles.selectedChip,
                    progress > 0 && progress < 100 && styles.disabledChip,
                  ]}
                  disabled={progress > 0 && progress < 100}
                  onPress={() => setSelectedType(type)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedType === type && styles.selectedChipText,
                    ]}
                  >
                    {EPaperDimensions[type].label}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Target: {config.width} x {config.height} px
          </Text>
        </View>

        {/* 3. Action Button */}
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
              <View
                style={[styles.progressBarFill, { width: `${progress}%` }]}
              />
            </View>
            <Text style={styles.warning}>⚠️ DO NOT MOVE PHONE</Text>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
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
