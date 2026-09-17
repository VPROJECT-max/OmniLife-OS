import { useState, useEffect } from 'react';
import { StyleSheet, Button, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Text, View } from '@/components/Themed';

const INITIAL_CHORES = [
  { id: '1', title: 'Replace HVAC Filter', completed: false },
  { id: '2', title: 'Flush Water Heater', completed: false },
  { id: '3', title: 'Test Smoke Alarms', completed: false },
  { id: '4', title: 'Clean Gutters', completed: false },
];

export default function ChoresScreen() {
  const [chores, setChores] = useState<any[]>([]);

  useEffect(() => {
    loadChores();
  }, []);

  const loadChores = async () => {
    const data = await AsyncStorage.getItem('chores_list');
    if (data) {
      setChores(JSON.parse(data));
    } else {
      setChores(INITIAL_CHORES);
    }
  };

  const toggleChore = async (id: string) => {
    const updated = chores.map(c => c.id === id ? { ...c, completed: !c.completed } : c);
    setChores(updated);
    await AsyncStorage.setItem('chores_list', JSON.stringify(updated));
  };

  const resetChores = async () => {
    setChores(INITIAL_CHORES);
    await AsyncStorage.setItem('chores_list', JSON.stringify(INITIAL_CHORES));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Maintenance</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      
      <FlatList
        data={chores}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => toggleChore(item.id)} style={styles.listItem}>
            <Text style={[styles.choreText, item.completed && styles.completedText]}>
              {item.completed ? '✅ ' : '⬜ '}{item.title}
            </Text>
          </TouchableOpacity>
        )}
        style={{ width: '100%' }}
      />
      
      <View style={{ marginTop: 20, marginBottom: 40 }}>
        <Button title="Reset All Chores" onPress={resetChores} color="red" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 50 },
  separator: { marginVertical: 20, height: 1, width: '80%' },
  listItem: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#ccc', width: '100%' },
  choreText: { fontSize: 18 },
  completedText: { textDecorationLine: 'line-through', color: '#888' },
});
