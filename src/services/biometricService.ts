import { Platform, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricStatus {
  hasHardware: boolean;
  isEnrolled: boolean;
  isSupported: boolean;
  biometricType: 'FaceID' | 'TouchID' | 'Fingerprint' | 'Biometrics' | 'None';
  label: string;
}

export const BiometricService = {
  /**
   * Checks whether the device hardware supports biometrics, if user is enrolled,
   * and determines whether Face ID, Touch ID, or fingerprint is configured.
   */
  async checkBiometricStatus(): Promise<BiometricStatus> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let biometricType: BiometricStatus['biometricType'] = 'None';
      let label = 'Biometrics';

      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        biometricType = Platform.OS === 'ios' ? 'FaceID' : 'Biometrics';
        label = 'Face ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        biometricType = Platform.OS === 'ios' ? 'TouchID' : 'Fingerprint';
        label = Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        biometricType = 'Biometrics';
        label = 'Iris Scan';
      } else if (Platform.OS === 'ios') {
        biometricType = 'FaceID';
        label = 'Face ID';
      }

      const hasBiometrics = hasHardware || Platform.OS === 'ios';

      return {
        hasHardware: hasBiometrics,
        isEnrolled,
        isSupported: hasBiometrics,
        biometricType,
        label,
      };
    } catch (e) {
      console.warn('BiometricService check failed:', e);
      return {
        hasHardware: Platform.OS === 'ios',
        isEnrolled: false,
        isSupported: Platform.OS === 'ios',
        biometricType: Platform.OS === 'ios' ? 'FaceID' : 'None',
        label: 'Face ID',
      };
    }
  },

  /**
   * Prompts native Face ID / Touch ID / Device Passcode authentication dialog.
   * Enables native device passcode fallback so the user can enter their password/passcode.
   */
  async authenticate(promptMessage: string = 'Unlock Screenalyze with Face ID'): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: 'Enter Passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      console.log('[BiometricService] authenticate result:', JSON.stringify(result));

      if (result.success) {
        return true;
      }

      // User cancelled or opted to dismiss prompt
      if (
        result.error === 'user_cancel' ||
        result.error === 'app_cancel' ||
        result.error === 'system_cancel' ||
        result.error === 'user_fallback'
      ) {
        return false;
      }

      if (result.error === 'not_enrolled') {
        Alert.alert(
          'Security Setup Required',
          'No Face ID, Touch ID, or device passcode is configured on this device. Please set up a passcode or biometrics in your device Settings.',
          [{ text: 'OK' }]
        );
      } else if (result.error === 'passcode_not_set') {
        Alert.alert(
          'Passcode Setup Required',
          'Please configure a device passcode in your iPhone Settings to use native authentication.',
          [{ text: 'OK' }]
        );
      }

      return false;
    } catch (e) {
      console.warn('Biometric authentication failed or was cancelled:', e);
      return false;
    }
  },
};
