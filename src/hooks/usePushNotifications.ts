import { useEffect, useRef, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const usePushNotifications = () => {
  const { user } = useAuth();
  const registeredRef = useRef(false);
  const [showPrePermission, setShowPrePermission] = useState(false);

  useEffect(() => {
    if (!user || !Capacitor.isNativePlatform()) return;
    if (registeredRef.current) return;

    const checkPermission = async () => {
      try {
        const result = await PushNotifications.checkPermissions();
        if (result.receive === "granted") {
          doRegister();
        } else if (result.receive !== "denied") {
          setShowPrePermission(true);
        }
      } catch {
        setShowPrePermission(true);
      }
    };

    checkPermission();
  }, [user]);

  const doRegister = useCallback(async () => {
    if (!user || registeredRef.current) return;
    registeredRef.current = true;

    const userId = user.id;
    const platform = Capacitor.getPlatform();

    await PushNotifications.addListener("registration", async (token) => {
      console.log("[Push] ✅ Token received:", token.value);
      const { error } = await supabase
        .from("push_tokens")
        .upsert({ user_id: userId, token: token.value, platform }, { onConflict: "user_id,token" });
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

    const permission = await PushNotifications.requestPermissions();
    console.log("[Push] Permission result:", permission.receive);

    if (permission.receive !== "granted") {
      console.warn("[Push] ⚠️ Permission not granted");
      return;
    }

    console.log("[Push] ✅ Permission granted, calling register()...");
    await PushNotifications.register();
    console.log("[Push] register() called");

    if (platform === "ios") {
      window.addEventListener(
        "fcmTokenReceived",
        async (event: any) => {
          const token = event.detail;
          console.log("[Push] ✅ FCM Token from Firebase:", token);
          const { error } = await supabase
            .from("push_tokens")
            .upsert({ user_id: userId, token, platform }, { onConflict: "user_id,token" });
          if (error) {
            console.error("[Push] ❌ Failed to save FCM token:", error.message);
          } else {
            console.log("[Push] ✅ FCM token saved");
          }
        },
        { once: true },
      );
    }
  }, [user]);

  const acceptPushPermission = useCallback(() => {
    setShowPrePermission(false);
    doRegister();
  }, [doRegister]);

  const dismissPushPermission = useCallback(() => {
    setShowPrePermission(false);
  }, []);

  return {
    showPrePermission,
    acceptPushPermission,
    dismissPushPermission,
  };
};
