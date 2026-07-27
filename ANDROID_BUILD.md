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

- إذن الميكروفون (`RECORD_AUDIO`) مضاف في `AndroidManifest.xml` ويُطلب تلقائيًا عند فتح التطبيق، لذلك يعمل الإدخال الصوتي داخل التطبيق وليس في المتصفح فقط.
- الإدخال الصوتي يحتاج اتصال إنترنت لأن تفريغ الصوت يتم على الخادم. لهذا يفتح التطبيق نسخة الويب المنشورة داخل WebView (`server.url` في `capacitor.config.ts`).
- لتشغيل نسخة مضمّنة بالكامل داخل الجهاز (بدون WebView للنسخة المنشورة): احذف كتلة `server` من `capacitor.config.ts` ثم أعد `npm run android:sync`. في هذه الحالة سيتوقف تفريغ الصوت ما لم توجّهه إلى خادم خارجي.
- الديون والجيب تُحفظ محليًا في الجهاز كما هي.
- تغيير رقم الإصدار: `versionCode` و `versionName` في `android/app/build.gradle`.
