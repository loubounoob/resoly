import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const registeredRef = useRef(false);

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;
    if (registeredRef.current) return;
    registeredRef.current = true;

    const userId = user.id;
    const platform = Capacitor.getPlatform(); // 'ios' | 'android'

    const setup = async () => {
      // 1. Register listeners BEFORE calling register()
      await PushNotifications.addListener("registration", async (token) => {
        console.log("[Push] ✅ Token received:", token.value);

        const { error } = await supabase.from("push_tokens").upsert(
          { user_id: userId, token: token.value, platform },
          { onConflict: "user_id,token" }
        );

        if (error) {
          console.error("[Push] ❌ Failed to save token:", error.message);
        } else {
          console.log("[Push] ✅ Token saved to database");
        }
      });

      await PushNotifications.addListener("registrationError", (err) => {
        console.error("[Push] ❌ Registration error:", JSON.stringify(err));
      });

      await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        console.log("[Push] 📩 Notification received:", notification);
      });

      await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        console.log("[Push] 👆 Action performed:", action);
      });

      // 2. Request permissions
      const permission = await PushNotifications.requestPermissions();
      console.log("[Push] Permission result:", permission.receive);

      if (permission.receive !== "granted") {
        console.warn("[Push] ⚠️ Permission not granted");
        return;
      }

      console.log("[Push] ✅ Permission granted, calling register()...");

      // 3. Register (triggers 'registration' listener above)
      await PushNotifications.register();
      console.log("[Push] register() called");
    };

    setup();

    return () => {
      PushNotifications.removeAllListeners();
      registeredRef.current = false;
    };
  }, [user]);
};
