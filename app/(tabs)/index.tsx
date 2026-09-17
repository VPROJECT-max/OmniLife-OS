import { useState, useCallback } from 'react';
import { StyleSheet, Button } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Text, View } from '@/components/Themed';

export default function DashboardScreen() {
  const [totalCalories, setTotalCalories] = useState(0);

  const loadData = async () => {
    try {
      const currentLogStr = await AsyncStorage.getItem('meals_log');
      if (currentLogStr) {
        const currentLog = JSON.parse(currentLogStr);
        const total = currentLog.reduce((sum: number, meal: any) => sum + meal.calories, 0);
        setTotalCalories(total);
      } else {
        setTotalCalories(0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const clearData = async () => {
    await AsyncStorage.removeItem('meals_log');
    setTotalCalories(0);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      
      <View style={styles.ringContainer}>
        <Text style={styles.ringText}>{totalCalories}</Text>
        <Text style={styles.ringLabel}>/ 2000 kcal</Text>
      </View>

      <Text style={{ marginTop: 30, fontSize: 18 }}>Chores Due Today: 2</Text>

      <View style={{ marginTop: 50 }}>
        <Button title="Reset Data" onPress={clearData} color="red" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  ringContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 10,
    borderColor: '#0a7ea4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  ringLabel: {
    fontSize: 16,
    color: '#888',
  },
});
