package com.zorvani.erp;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Prints an HTML document through the Android print service.
 *
 * Android WebViews do not implement window.print(), so the invoice print
 * dialog sends its document here instead. The HTML is loaded into an
 * off-screen WebView and handed to PrintManager with the paper size that
 * matches the selected invoice format (A4, A5 landscape, 80mm receipt).
 *
 * Copied into the generated Android project by mobile/setup-android.ps1.
 */
@CapacitorPlugin(name = "NativePrint")
public class NativePrintPlugin extends Plugin {

    private static final double MILS_PER_MM = 1000.0 / 25.4;

    /** Held until the print job has been created so the WebView is not garbage collected. */
    private WebView printWebView;

    @PluginMethod
    public void printHtml(final PluginCall call) {
        final String html = call.getString("html");
        if (html == null || html.isEmpty()) {
            call.reject("html is required");
            return;
        }
        final String jobName = call.getString("jobName", "ZorvanI ERP");
        final String paper = call.getString("paper", "a4");
        final Integer heightMm = call.getInt("heightMm", 297);

        getActivity().runOnUiThread(() -> {
            try {
                WebView webView = new WebView(getContext());
                printWebView = webView;
                webView.getSettings().setJavaScriptEnabled(false);
                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public void onPageFinished(WebView view, String url) {
                        try {
                            PrintManager printManager =
                                (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                            if (printManager == null) {
                                call.reject("Printing is not available on this device");
                                return;
                            }
                            PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(jobName);
                            printManager.print(jobName, adapter, buildAttributes(paper, heightMm == null ? 297 : heightMm));
                            call.resolve();
                        } catch (Exception error) {
                            call.reject("Could not start printing", error);
                        } finally {
                            printWebView = null;
                        }
                    }
                });
                webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
            } catch (Exception error) {
                printWebView = null;
                call.reject("Could not prepare the document for printing", error);
            }
        });
    }

    private PrintAttributes buildAttributes(String paper, int heightMm) {
        PrintAttributes.Builder builder = new PrintAttributes.Builder();
        if ("a5-landscape".equals(paper)) {
            builder.setMediaSize(PrintAttributes.MediaSize.ISO_A5.asLandscape());
        } else if ("receipt80".equals(paper)) {
            int widthMils = (int) Math.round(80 * MILS_PER_MM);
            int heightMils = Math.max((int) Math.round(heightMm * MILS_PER_MM), widthMils + 1);
            builder.setMediaSize(
                new PrintAttributes.MediaSize("ZORVANI_RECEIPT_80MM", "80mm receipt", widthMils, heightMils)
            );
            builder.setMinMargins(PrintAttributes.Margins.NO_MARGINS);
        } else {
            builder.setMediaSize(PrintAttributes.MediaSize.ISO_A4);
        }
        return builder.build();
    }
}
