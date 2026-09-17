import { useState, useEffect } from 'react';
import { StyleSheet, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { Text, View } from '@/components/Themed';

export default function SettingsModalScreen() {
  const [apiKey, setApiKey] = useState('');
  const version = Constants.expoConfig?.version || '1.0.0';

  useEffect(() => {
    const loadKey = async () => {
      const storedKey = await AsyncStorage.getItem('openai_api_key');
      if (storedKey) setApiKey(storedKey);
    };
    loadKey();
  }, []);

  const saveKey = async () => {
    try {
      await AsyncStorage.setItem('openai_api_key', apiKey);
      Alert.alert('Success', 'API Key saved successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to save API key.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>OmniLife OS Settings</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      
      <Text style={styles.label}>OpenAI API Key:</Text>
      <TextInput
        style={styles.input}
        placeholder="sk-..."
        placeholderTextColor="#888"
        value={apiKey}
        onChangeText={setApiKey}
        secureTextEntry
        autoCapitalize="none"
      />
      <Button title="Save API Key" onPress={saveKey} />

      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <Text style={styles.versionText}>Version {version}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  label: {
    fontSize: 16,
    alignSelf: 'flex-start',
    marginLeft: '10%',
    marginBottom: 10,
  },
  input: {
    width: '80%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    color: 'black',
    backgroundColor: '#fff',
  },
  versionText: {
    marginTop: 20,
    fontSize: 14,
    color: '#888',
  },
});
