import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.deinakbisawtak",
  appName: "دينك بصوتك",
  // مجلد الويب المبني. يُملأ عبر السكربت: bun run android:sync
  webDir: "dist",
  server: {
    // التطبيق يعمل داخل WebView على النسخة المنشورة حتى يعمل الإدخال الصوتي (التفريغ الصوتي يحتاج الخادم).
    // لتشغيل نسخة مضمّنة بالكامل داخل الجهاز، احذف كتلة server هذه ثم نفّذ: bun run android:sync
    url: "https://voice-debt-pocket.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
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
