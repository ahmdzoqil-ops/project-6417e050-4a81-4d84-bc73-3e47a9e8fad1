# بناء تطبيق أندرويد (دينك بصوتك)

التطبيق مغلّف عبر **Capacitor**، ومجلد المشروع الأصلي موجود في `android/`.

## المتطلبات

- Node.js 20+ و Java JDK 21
- Android Studio (أو Android SDK + Gradle)

## 1) تجهيز الملفات

```bash
npm install            # أو bun install
npm run android:sync   # يبني الويب + ينسخه إلى dist + ينفّذ cap sync android
```

## 2) بناء APK للتجربة (بدون توقيع رسمي)

```bash
npm run android:apk:debug
# الناتج: android/app/build/outputs/apk/debug/app-debug.apk
```

## 3) بناء APK للإصدار (موقّع)

أنشئ مفتاح التوقيع مرة واحدة:

```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

ثم انسخ `android/keystore.properties.example` إلى `android/keystore.properties` وعدّل القيم، ثم:

```bash
npm run android:apk
# الناتج: android/app/build/outputs/apk/release/app-release.apk
```

## 4) بناء AAB لمتجر Google Play

```bash
npm run android:aab
# الناتج: android/app/build/outputs/bundle/release/app-release.aab
```

## 5) فتح المشروع في Android Studio

```bash
npm run android:open
```

## ملاحظات

- التطبيق **مستقل**: لا يوجد `server.url` في `capacitor.config.ts`، وواجهة التطبيق تُحمّل من الملفات المحلية داخل `android/app/src/main/assets/public`.
- `npm run android:sync` يبني الويب، ثم يولّد صفحة `index.html` ثابتة (`scripts/prerender-index.mjs`)، ثم ينسخها إلى `dist` ويشغّل `cap sync android`.
- إذن الميكروفون (`RECORD_AUDIO`) مضاف في `AndroidManifest.xml` ويُطلب تلقائيًا عند فتح التطبيق.
- الديون والجيب تُحفظ محليًا في الجهاز وتعمل بدون إنترنت.
- الإدخال الصوتي فقط يحتاج إنترنت (تفريغ الصوت على الخادم) ويستدعي `https://voice-debt-pocket.lovable.app/api/public/transcribe`.
- تغيير رقم الإصدار: `versionCode` و `versionName` في `android/app/build.gradle`.

