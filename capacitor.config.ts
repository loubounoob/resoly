import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.5c65089456bd44fb862616888b29a22c',
  appName: 'go-earn-great',
  webDir: 'dist',
  server: {
    url: 'https://5c650894-56bd-44fb-8626-16888b29a22c.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
