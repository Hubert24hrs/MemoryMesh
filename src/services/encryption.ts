import * as SecureStore from 'expo-secure-store';

export const encryptionService = {
    setItem: async (key: string, value: string) => {
        try {
            await SecureStore.setItemAsync(key, value);
        } catch (error) {
            console.error('Error encrypting item:', error);
            throw error;
        }
    },
    getItem: async (key: string) => {
        try {
            return await SecureStore.getItemAsync(key);
        } catch (error) {
            console.error('Error decrypting item:', error);
            return null;
        }
    },
    deleteItem: async (key: string) => {
        try {
            await SecureStore.deleteItemAsync(key);
        } catch (error) {
            console.error('Error deleting encrypted item:', error);
            throw error;
        }
    },
    initialize: async () => {
        // Check if SecureStore is available
        const isAvailable = await SecureStore.isAvailableAsync();
        if (!isAvailable) {
            console.warn('SecureStore is not available on this device');
        }
    },
};
