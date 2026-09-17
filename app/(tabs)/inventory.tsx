import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/Theme';
import { analyzeInventoryImage } from '@/services/aiService';

export default function InventoryScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'list' | 'camera' | 'preview'>('list');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    const data = await AsyncStorage.getItem('home_inventory');
    if (data) setInventoryList(JSON.parse(data));
    else setInventoryList([]);
  };

  const deleteItem = async (index: number) => {
    const updated = inventoryList.filter((_, i) => i !== index);
    setInventoryList(updated);
    await AsyncStorage.setItem('home_inventory', JSON.stringify(updated));
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setMode('camera');
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const data = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
      setPhoto(data.uri);
      setMode('preview');
      analyzePhoto(data.base64);
    }
  };

  const analyzePhoto = async (b64: string) => {
    setIsAnalyzing(true);
    try {
      const items = await analyzeInventoryImage(b64);
      setScannedItems(items);
    } catch (e: any) {
      Alert.alert('Analysis Failed', e.message);
      setMode('list');
      setPhoto(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveScannedItems = async () => {
    const existing = await AsyncStorage.getItem('home_inventory');
    const list = existing ? JSON.parse(existing) : [];
    const newList = [...list, ...scannedItems.map((i: any) => ({ ...i, addedAt: new Date().toISOString() }))];
    await AsyncStorage.setItem('home_inventory', JSON.stringify(newList));
    Alert.alert('✅ Saved', `${scannedItems.length} items added!`);
    setScannedItems([]);
    setPhoto(null);
    setMode('list');
    loadInventory();
  };

  // Camera mode
  if (mode === 'camera') {
    return (
      <View style={styles.container}>
        <CameraView style={StyleSheet.absoluteFill} facing="back" ref={cameraRef}>
          <View style={styles.cameraOverlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setMode('list')}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.cameraBottom}>
              <TouchableOpacity style={styles.shutterBtn} onPress={takePicture}>
                <View style={styles.shutterInner} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // Preview mode
  if (mode === 'preview' && photo) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <View style={styles.previewOverlay}>
          {isAnalyzing ? (
            <View style={styles.analyzingCard}>
              <ActivityIndicator size="large" color={Colors.secondary} />
              <Text style={styles.analyzingText}>Scanning for items...</Text>
            </View>
          ) : scannedItems.length > 0 ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>Found {scannedItems.length} Items</Text>
              {scannedItems.map((item, idx) => (
                <View key={idx} style={styles.scannedRow}>
                  <View>
                    <Text style={styles.scannedName}>{item.name}</Text>
                    <Text style={styles.scannedCat}>{item.category}</Text>
                  </View>
                  <Text style={styles.scannedPrice}>${item.estimated_value}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.saveBtn} onPress={saveScannedItems}>
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Add All to Inventory</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setPhoto(null); setScannedItems([]); setMode('list'); }}>
                <Text style={styles.cancelBtnText}>Discard</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  // List mode
  const totalValue = inventoryList.reduce((s, i) => s + (i.estimated_value || 0), 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Home Inventory</Text>
      <Text style={styles.subtitle}>Track your belongings & their value</Text>

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>Total Items</Text>
          <Text style={styles.summaryValue}>{inventoryList.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View>
          <Text style={styles.summaryLabel}>Est. Value</Text>
          <Text style={styles.summaryValue}>${totalValue.toLocaleString()}</Text>
        </View>
      </View>

      {/* Scan button */}
      <TouchableOpacity style={styles.scanBtn} onPress={openCamera}>
        <Ionicons name="scan" size={22} color="#fff" />
        <Text style={styles.scanBtnText}>Scan Room / Items</Text>
      </TouchableOpacity>

      {/* Items */}
      {inventoryList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="cube-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No items in inventory</Text>
          <Text style={styles.emptyHint}>Tap "Scan Room" to add items with AI</Text>
        </View>
      ) : (
        inventoryList.map((item, idx) => (
          <View key={idx} style={styles.itemCard}>
            <View style={[styles.itemIcon, { backgroundColor: Colors.secondary + '20' }]}>
              <Ionicons name="cube" size={22} color={Colors.secondary} />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemCat}>{item.category || 'Uncategorized'}</Text>
            </View>
            <Text style={styles.itemPrice}>${item.estimated_value}</Text>
            <TouchableOpacity onPress={() => deleteItem(idx)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
  subtitle: { fontSize: FontSize.md, color: Colors.textSecondary, marginBottom: Spacing.xl },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryValue: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.text },
  summaryDivider: { width: 1, height: 40, backgroundColor: Colors.border },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.secondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  scanBtnText: { fontSize: FontSize.md, fontWeight: '700', color: '#fff' },
  emptyCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptyText: { fontSize: FontSize.md, color: Colors.textSecondary },
  emptyHint: { fontSize: FontSize.sm, color: Colors.textMuted },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text },
  itemCat: { fontSize: FontSize.sm, color: Colors.textSecondary },
  itemPrice: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.success, marginRight: Spacing.sm },

  // Camera
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  backBtn: {
    marginTop: 60, marginLeft: 20, width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  cameraBottom: { alignItems: 'center', marginBottom: 50 },
  shutterBtn: {
    width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },

  // Preview
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: Spacing.lg,
    paddingBottom: 50,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  analyzingCard: {
    backgroundColor: Colors.bgCard, borderRadius: BorderRadius.xl, padding: Spacing.xl,
    alignItems: 'center', gap: Spacing.md,
  },
  analyzingText: { fontSize: FontSize.lg, color: Colors.text, fontWeight: '600' },
  resultCard: {
    backgroundColor: Colors.bgCard, borderRadius: BorderRadius.xl, padding: Spacing.xl, gap: Spacing.md,
  },
  resultTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text },
  scannedRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  scannedName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.text },
  scannedCat: { fontSize: FontSize.sm, color: Colors.textSecondary },
  scannedPrice: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.success },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
    backgroundColor: Colors.secondary, borderRadius: BorderRadius.md, padding: Spacing.md, marginTop: Spacing.sm,
  },
  saveBtnText: { fontSize: FontSize.md, fontWeight: '700', color: '#fff' },
  cancelBtn: { alignItems: 'center', padding: Spacing.sm },
  cancelBtnText: { fontSize: FontSize.md, color: Colors.textSecondary },
});
