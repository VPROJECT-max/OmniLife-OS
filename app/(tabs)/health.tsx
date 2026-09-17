import { useState, useRef } from 'react';
import { StyleSheet, Button, Image, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Text, View } from '@/components/Themed';

export default function HealthScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [macros, setMacros] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);
  
  const cameraRef = useRef<any>(null);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const options = { quality: 0.5, base64: true };
      const data = await cameraRef.current.takePictureAsync(options);
      setPhoto(data.uri);
      analyzePhoto(data.base64);
    }
  };

  const analyzePhoto = async (base64Image: string) => {
    setIsAnalyzing(true);
    try {
      const apiKey = await AsyncStorage.getItem('openai_api_key');
      if (!apiKey) {
        Alert.alert('Missing API Key', 'Please set your OpenAI API Key in the Settings modal first.');
        setIsAnalyzing(false);
        setPhoto(null);
        return;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this image of food. Estimate the Calories, Protein (g), Carbs (g), and Fat (g). Return ONLY a JSON object with keys 'calories', 'protein', 'carbs', and 'fat' containing integer values. Do not use markdown backticks." },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
              ]
            }
          ],
          max_tokens: 300
        })
      });

      const json = await response.json();
      if (json.error) {
        throw new Error(json.error.message);
      }
      
      const content = json.choices[0].message.content.trim();
      const parsed = JSON.parse(content);
      
      setMacros({
        calories: parsed.calories || 0,
        protein: parsed.protein || 0,
        carbs: parsed.carbs || 0,
        fat: parsed.fat || 0,
      });

    } catch (e: any) {
      console.error(e);
      Alert.alert('Analysis Failed', e.message || 'Could not analyze the image.');
      setPhoto(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveToLog = async () => {
    if (!macros) return;
    try {
      const currentLogStr = await AsyncStorage.getItem('meals_log');
      const currentLog = currentLogStr ? JSON.parse(currentLogStr) : [];
      currentLog.push({ ...macros, date: new Date().toISOString() });
      await AsyncStorage.setItem('meals_log', JSON.stringify(currentLog));
      Alert.alert('Success', 'Meal logged successfully!');
      setPhoto(null);
      setMacros(null);
    } catch (e) {
      console.error(e);
    }
  };

  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo }} style={styles.preview} />
        {isAnalyzing ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.overlayText}>AI is analyzing your meal...</Text>
          </View>
        ) : macros ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.title}>AI Results</Text>
            <Text>Calories: {macros.calories} kcal</Text>
            <Text>Protein: {macros.protein}g</Text>
            <Text>Carbs: {macros.carbs}g</Text>
            <Text>Fat: {macros.fat}g</Text>
            <View style={{ marginTop: 20 }}>
              <Button title="Save to Log" onPress={saveToLog} />
              <Button title="Retake" onPress={() => { setPhoto(null); setMacros(null); }} color="red" />
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef}>
        <View style={styles.buttonContainer}>
          <Button title="Snap Meal" onPress={takePicture} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  camera: { flex: 1 },
  buttonContainer: {
    flex: 1, flexDirection: 'row', backgroundColor: 'transparent',
    margin: 64, justifyContent: 'center', alignItems: 'flex-end',
  },
  preview: { flex: 1, resizeMode: 'cover' },
  overlay: {
    position: 'absolute', top: '40%', left: '20%', right: '20%',
    backgroundColor: 'rgba(0,0,0,0.7)', padding: 20, borderRadius: 10, alignItems: 'center',
  },
  overlayText: { color: 'white', marginTop: 10 },
  resultsContainer: {
    position: 'absolute', bottom: 50, left: 20, right: 20,
    backgroundColor: 'white', padding: 20, borderRadius: 15,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5,
  },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: 'black' },
});
