import { TEST_BITMAP_BASE64 } from "@/constants/bitmap";
import StidgetWaveshareNfc from "@/modules/@stidget/waveshare-nfc"; // Adjust path
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import NfcManager, { NfcTech } from "react-native-nfc-manager";

// This is a placeholder for a blank 264x176 white bitmap in base64
// In a real scenario, you'd generate this via a canvas or image tool

const HomeScreen = () => {
  const [status, setStatus] = useState("Ready to Flash");
  const [progress, setProgress] = useState(0);

  const startNfcDiscovery = async () => {
    try {
      setStatus("Scanning... Hold badge to phone");
      await NfcManager.requestTechnology(NfcTech.NfcA);
      const tag = await NfcManager.getTag();

      if (tag) {
        setStatus("Tag Detected! Flashing...");
        // Pass the native tag object directly to your module
        const success = await StidgetWaveshareNfc.flashImage(
          TEST_BITMAP_BASE64,
          tag,
        );

        if (success) {
          Alert.alert("Success", "E-Paper Updated!");
        } else {
          Alert.alert("Error", "Flash failed. Check connection.");
        }
      }
    } catch (ex) {
      console.warn(ex);
      setStatus("Retry Scan");
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Waveshare 2.7" Test</Text>

      <TouchableOpacity style={styles.button} onPress={startNfcDiscovery}>
        <Text style={styles.buttonText}>{status}</Text>
      </TouchableOpacity>

      {progress > 0 && (
        <View style={styles.progressContainer}>
          <Text>Progress: {progress}%</Text>
          <Text style={styles.warning}>DO NOT MOVE PHONE</Text>
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
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
  progressContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  warning: {
    color: "red",
    fontSize: 12,
    marginTop: 5,
  },
});
