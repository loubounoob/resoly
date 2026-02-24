import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.5c65089456bd44fb862616888b29a22c',
  appName: 'resoly',
  webDir: 'dist',
  server: {
    url: 'https://5c650894-56bd-44fb-8626-16888b29a22c.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Geolocation: {
      // iOS: NSLocationWhenInUseUsageDescription must be set in Info.plist
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#FF6B35',
    },
  },
};

export default config;
