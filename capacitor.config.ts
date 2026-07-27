import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.deinakbisawtak",
  appName: "دينك بصوتك",
  // مجلد الويب المبني محليًا داخل التطبيق. يُملأ عبر: npm run android:sync
  webDir: "dist",
  // لا يوجد server.url: التطبيق مستقل ويعمل من الملفات المحلية داخل الجهاز.
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0f172a",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
