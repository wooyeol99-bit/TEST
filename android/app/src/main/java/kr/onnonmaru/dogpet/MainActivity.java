package kr.onnonmaru.dogpet;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Build;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * 게임 전체를 앱 안의 웹뷰로 띄운다.
 * 인터넷을 쓰지 않고 assets 폴더의 파일만 읽으므로 비행기 모드에서도 동작한다.
 */
public class MainActivity extends Activity {

  private WebView web;

  @SuppressLint("SetJavaScriptEnabled")
  @Override
  protected void onCreate(Bundle state) {
    super.onCreate(state);

    web = new WebView(this);
    web.setLayoutParams(new ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    web.setBackgroundColor(0xFFFDF8F1);
    web.setOverScrollMode(WebView.OVER_SCROLL_NEVER);

    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);      /* 세이브 데이터(localStorage) */
    s.setDatabaseEnabled(true);
    s.setAllowFileAccess(true);
    s.setLoadWithOverviewMode(false);
    s.setUseWideViewPort(true);
    s.setSupportZoom(false);
    s.setBuiltInZoomControls(false);
    s.setDisplayZoomControls(false);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setCacheMode(WebSettings.LOAD_NO_CACHE);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    }

    /* 바깥 링크로 새어 나가지 않도록 앱 내부 파일만 연다 */
    web.setWebViewClient(new WebViewClient() {
      @Override
      public boolean shouldOverrideUrlLoading(WebView view, String url) {
        return !url.startsWith("file:///android_asset/");
      }
    });

    setContentView(web);
    web.loadUrl("file:///android_asset/index.html");
  }

  @Override
  public void onBackPressed() {
    if (web != null && web.canGoBack()) web.goBack();
    else super.onBackPressed();
  }

  @Override
  protected void onPause() {
    super.onPause();
    if (web != null) web.onPause();
  }

  @Override
  protected void onResume() {
    super.onResume();
    if (web != null) web.onResume();
  }

  @Override
  protected void onDestroy() {
    if (web != null) { web.destroy(); web = null; }
    super.onDestroy();
  }
}
