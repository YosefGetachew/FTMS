import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getSessionItem(key) {
  return AsyncStorage.getItem(key);
}

export async function setSessionItem(key, value) {
  return AsyncStorage.setItem(key, value);
}

export async function deleteSessionItem(key) {
  return AsyncStorage.removeItem(key);
}
