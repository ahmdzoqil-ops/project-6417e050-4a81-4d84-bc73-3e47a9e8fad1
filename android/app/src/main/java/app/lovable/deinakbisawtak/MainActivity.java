package app.lovable.deinakbisawtak;

import android.Manifest;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private static final int MIC_PERMISSION_REQUEST = 4321;
  private static final String PREFS = "app_build_state";
  private static final String KEY_VERSION = "last_version_code";

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // مسح ذاكرة WebView المؤقتة عند تحديث التطبيق، حتى تظهر آخر التعديلات دائمًا
    clearCacheOnUpgrade();

    // طلب إذن الميكروفون عند فتح التطبيق حتى يعمل الإدخال الصوتي داخل التطبيق
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
        != PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(
          this, new String[] {Manifest.permission.RECORD_AUDIO}, MIC_PERMISSION_REQUEST);
    }
  }

  private void clearCacheOnUpgrade() {
    int currentVersion = 0;
    try {
      currentVersion = getPackageManager().getPackageInfo(getPackageName(), 0).versionCode;
    } catch (PackageManager.NameNotFoundException ignored) {
      // نتجاهل: سنستخدم 0
    }

    SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
    int lastVersion = prefs.getInt(KEY_VERSION, -1);

    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
    if (webView != null) {
      WebSettings settings = webView.getSettings();
      // الملفات محلية داخل التطبيق، فلا حاجة لأي تخزين مؤقت للشبكة
      settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
      if (lastVersion != currentVersion) {
        webView.clearCache(true);
        webView.clearHistory();
      }
    }

    if (lastVersion != currentVersion) {
      prefs.edit().putInt(KEY_VERSION, currentVersion).apply();
    }
  }
}
