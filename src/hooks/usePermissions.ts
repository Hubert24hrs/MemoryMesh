// src/hooks/usePermissions.ts
import { useState } from 'react';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';

type PermissionType = 'camera' | 'microphone' | 'notifications' | 'photos';

export const usePermissions = () => {
  const [permissionsState, setPermissionsState] = useState<Record<PermissionType, boolean>>({
    camera: false,
    microphone: false,
    notifications: false,
    photos: false,
  });

  /**
   * Request device permission dynamically by category type
   */
  const requestPermission = async (type: PermissionType): Promise<boolean> => {
    try {
      let granted = false;

      switch (type) {
        case 'camera':
          const cameraStatus = await Camera.requestCameraPermissionsAsync();
          granted = cameraStatus.status === 'granted';
          break;

        case 'microphone':
          const microStatus = await Audio.requestPermissionsAsync();
          granted = microStatus.status === 'granted';
          break;

        case 'notifications':
          const notifyStatus = await Notifications.requestPermissionsAsync();
          granted = notifyStatus.status === 'granted';
          break;

        case 'photos':
          const pickerStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
          granted = pickerStatus.status === 'granted';
          break;
      }

      setPermissionsState((prev) => ({
        ...prev,
        [type]: granted,
      }));

      return granted;
    } catch (e) {
      console.error(`Failed to request permission for ${type}:`, e);
      return false;
    }
  };

  /**
   * Safe check for active permissions status
   */
  const checkPermission = async (type: PermissionType): Promise<boolean> => {
    try {
      let granted = false;

      switch (type) {
        case 'camera':
          const cameraStatus = await Camera.getCameraPermissionsAsync();
          granted = cameraStatus.status === 'granted';
          break;

        case 'microphone':
          const microStatus = await Audio.getPermissionsAsync();
          granted = microStatus.status === 'granted';
          break;

        case 'notifications':
          const notifyStatus = await Notifications.getPermissionsAsync();
          granted = notifyStatus.status === 'granted';
          break;

        case 'photos':
          const pickerStatus = await ImagePicker.getMediaLibraryPermissionsAsync();
          granted = pickerStatus.status === 'granted';
          break;
      }

      return granted;
    } catch (e) {
      console.error(`Failed to check permission for ${type}:`, e);
      return false;
    }
  };

  return {
    permissionsState,
    requestPermission,
    checkPermission,
  };
};
export default usePermissions;
