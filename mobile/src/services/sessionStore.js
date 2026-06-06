import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const canUseSecureStore = Platform.OS !== 'web';

export async function getSessionItem(key) {
  if (canUseSecureStore) return SecureStore.getItemAsync(key);
  return AsyncStorage.getItem(key);
}

export async function setSessionItem(key, value) {
  if (canUseSecureStore) return SecureStore.setItemAsync(key, value);
  return AsyncStorage.setItem(key, value);
}

export async function deleteSessionItem(key) {
  if (canUseSecureStore) return SecureStore.deleteItemAsync(key);
  return AsyncStorage.removeItem(key);
}
