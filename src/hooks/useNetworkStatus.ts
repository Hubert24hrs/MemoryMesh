// src/hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { offlineSync } from '../services/offlineSync';

export const useNetworkStatus = () => {
  const [status, setStatus] = useState({
    isConnected: true,
    isInternetReachable: true,
    connectionType: 'unknown',
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      const isConnected = state.isConnected ?? false;
      const isInternetReachable = state.isInternetReachable ?? false;
      
      setStatus({
        isConnected,
        isInternetReachable,
        connectionType: state.type,
      });

      // Auto drain the sync queue on transition back online
      if (isConnected && isInternetReachable) {
        offlineSync.drainQueue().catch(console.error);
      }
    });

    return () => unsubscribe();
  }, []);

  return status;
};
export default useNetworkStatus;
