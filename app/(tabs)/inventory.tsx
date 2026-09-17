import { useState, useRef, useEffect } from 'react';
import { StyleSheet, Button, Image, ActivityIndicator, Alert, FlatList } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Text, View } from '@/components/Themed';

export default function InventoryScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [mode, setMode] = useState<'list' | 'camera'>('list');
  
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (mode === 'list') {
      loadInventory();
    }
  }, [mode]);

  const loadInventory = async () => {
    const data = await AsyncStorage.getItem('home_inventory');
    if (data) {
      setInventoryList(JSON.parse(data));
    }
  };

  const clearInventory = async () => {
    await AsyncStorage.removeItem('home_inventory');
    setInventoryList([]);
  };

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
                { type: "text", text: "Analyze this image and identify the primary valuable items or objects in it (e.g. appliances, electronics, furniture). Return ONLY a JSON array of objects. Each object should have keys 'name' (string) and 'estimated_value' (number). Do not use markdown backticks." },
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
      
      setItems(parsed);

    } catch (e: any) {
      console.error(e);
      Alert.alert('Analysis Failed', e.message || 'Could not analyze the image.');
      setPhoto(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveToLog = async () => {
    if (items.length === 0) return;
    try {
      const currentLogStr = await AsyncStorage.getItem('home_inventory');
      const currentLog = currentLogStr ? JSON.parse(currentLogStr) : [];
      const newLog = [...currentLog, ...items];
      await AsyncStorage.setItem('home_inventory', JSON.stringify(newLog));
      Alert.alert('Success', 'Items added to inventory!');
      setPhoto(null);
      setItems([]);
      setMode('list');
    } catch (e) {
      console.error(e);
    }
  };

  if (mode === 'list') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Home Inventory</Text>
        <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
        
        <FlatList
          data={inventoryList}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text style={{ fontWeight: 'bold' }}>{item.name}</Text>
              <Text>${item.estimated_value}</Text>
            </View>
          )}
          style={{ width: '100%' }}
        />
        
        <View style={{ marginTop: 20, flexDirection: 'row', gap: 10, paddingBottom: 30 }}>
          <Button title="Scan New Item" onPress={() => setMode('camera')} />
          <Button title="Clear Data" onPress={clearInventory} color="red" />
        </View>
      </View>
    );
  }

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  if (photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo }} style={styles.preview} />
        {isAnalyzing ? (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.overlayText}>AI is scanning for items...</Text>
          </View>
        ) : items.length > 0 ? (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Items Found</Text>
            {items.map((item, idx) => (
              <Text key={idx}>- {item.name} (${item.estimated_value})</Text>
            ))}
            <View style={{ marginTop: 20 }}>
              <Button title="Save to Inventory" onPress={saveToLog} />
              <Button title="Retake" onPress={() => { setPhoto(null); setItems([]); }} color="red" />
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
          <Button title="Cancel" onPress={() => setMode('list')} color="red" />
          <View style={{ width: 20 }} />
          <Button title="Scan Room" onPress={takePicture} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 50 },
  separator: { marginVertical: 20, height: 1, width: '80%' },
  listItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#ccc', width: '100%', flexDirection: 'row', justifyContent: 'space-between' },
  camera: { flex: 1, width: '100%' },
  buttonContainer: {
    flex: 1, flexDirection: 'row', backgroundColor: 'transparent',
    margin: 64, justifyContent: 'center', alignItems: 'flex-end',
  },
  preview: { flex: 1, resizeMode: 'cover', width: '100%' },
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
  resultsTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: 'black' },
});
