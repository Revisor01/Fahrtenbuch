package de.godsapp.fahrtenbuch;

import android.graphics.Color;
import android.graphics.drawable.Drawable;
import android.util.Base64;
import android.view.Gravity;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import androidx.annotation.Nullable;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.material.badge.BadgeDrawable;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Navigationsleiste nach Material 3 fuer die Android-Huelle.
 *
 * Warum eigenes Plugin: @capgo/capacitor-native-navigation zeichnet die Leiste
 * selbst (NativeTabbarLayout in onDraw) und bildet dabei das iOS-Idiom nach —
 * schwebende Kapsel, runder Aktiv-Kreis (GradientDrawable.OVAL, 58 dp fest
 * verdrahtet), abgesetzter Knopf ueber dem Inhalt. Material 3 verlangt eine
 * angedockte Leiste ueber die volle Breite mit Pillen-Indikator (64x32 dp).
 * Beides ist im Fremdplugin nicht einstellbar.
 *
 * Hier uebernimmt BottomNavigationView (NavigationBarView) aus
 * com.google.android.material die Zeichnung — Indikator, Ripple, Typografie
 * und Bedienhilfen kommen damit vom System statt aus eigenem Code.
 *
 * Die Bruecke haelt sich an die Schnittstelle des Fremdplugins (configure,
 * setTabbar, Event 'tabSelect'), damit NativeNav.js auf beiden Plattformen
 * denselben Weg geht.
 */
@CapacitorPlugin(name = "MaterialNav")
public class MaterialNavPlugin extends Plugin {

    private BottomNavigationView leiste;
    private FloatingActionButton aktionsKnopf;
    private FrameLayout behaelter;

    /** Ids in der Reihenfolge der Menue-Eintraege: Menue kennt nur int-Ids. */
    private final List<String> tabIds = new ArrayList<>();

    /** Id des Eintrags mit role != 'normal' — er bekommt den FAB, keinen Tab. */
    private String aktionsId;

    /**
     * Sperre gegen Rueckkopplung: setSelectedItemId loest den Listener erneut
     * aus. Ohne die Sperre meldete jede Auswahl aus JS ein tabSelect zurueck,
     * das JS erneut setzen liesse.
     */
    private boolean setztSelbst;

    /** Zuletzt gemeldeter unterer Systemabstand in Pixeln (Gesten/Tasten). */
    private int systemAbstand;

    /**
     * Zuletzt ausgewaehlte Id. Noetig, weil setzeTabs() das Menue leert und
     * damit auch die Auswahl verwirft — NativeNav.js schickt beim Wechsel aus
     * der Leiste aber bewusst kein selectedId mit ("vonNativ"). Ohne dieses
     * Gedaechtnis fiele die Pille jedes Mal auf den ersten Eintrag zurueck.
     */
    private String auswahlId;

    private int farbeAktiv = Color.parseColor("#0F5257");
    private int farbeInaktiv = Color.parseColor("#47605F");
    private int farbeFlaeche = Color.WHITE;
    private int farbeIndikator = Color.parseColor("#DBEAEA");
    private int farbeBadge = Color.parseColor("#B87A20");

    @PluginMethod
    public void configure(PluginCall call) {
        JSObject farben = call.getObject("colors");
        if (farben != null) {
            uebernimmFarben(farben);
        }
        call.resolve();
    }

    @PluginMethod
    public void setTabbar(PluginCall call) {
        final Boolean versteckt = call.getBoolean("hidden");
        final JSArray tabs = call.getArray("tabs");
        final String auswahl = call.getString("selectedId");
        final JSObject farben = call.getObject("colors");

        getActivity()
            .runOnUiThread(() -> {
                try {
                    if (farben != null) {
                        uebernimmFarben(farben);
                    }
                    baueAuf();

                    if (tabs != null) {
                        setzeTabs(tabs);
                        // Nach dem Neuaufbau ist keine Auswahl mehr gesetzt.
                        // Die gemerkte wieder herstellen, sonst springt die
                        // Pille auf den ersten Eintrag.
                        if (auswahl == null && auswahlId != null) {
                            waehle(auswahlId);
                        }
                    }
                    if (auswahl != null) {
                        waehle(auswahl);
                    }
                    int gesamt = hoeheDp() + alsDp(systemAbstand);
                    if (versteckt != null) {
                        behaelter.setVisibility(versteckt ? View.GONE : View.VISIBLE);
                        // Ist die Leiste weg, darf auch ihr Platzhalter im
                        // Inhalt verschwinden — sonst bliebe unten ein Streifen.
                        meldeHoehe(versteckt ? 0 : gesamt);
                    } else {
                        meldeHoehe(gesamt);
                    }
                    faerbe();
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Navigationsleiste liess sich nicht setzen: " + e.getMessage(), e);
                }
            });
    }

    /** Baut Behaelter, Leiste und Aktionsknopf einmalig auf. */
    private void baueAuf() {
        if (leiste != null) {
            return;
        }

        // android.R.id.content statt des WebView-Elternteils: Darueber liegt
        // ein CoordinatorLayout, das Gravity.BOTTOM nicht auswertet — die
        // Leiste landete damit am oberen Rand.
        ViewGroup wurzel = getActivity().findViewById(android.R.id.content);

        behaelter = new FrameLayout(getContext());
        FrameLayout.LayoutParams behaelterMasse = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM
        );
        behaelter.setLayoutParams(behaelterMasse);

        leiste = new BottomNavigationView(getContext());
        leiste.setLayoutParams(
            new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT,
                Gravity.BOTTOM
            )
        );
        // MD3: Beschriftungen stehen immer, nicht nur beim aktiven Eintrag.
        leiste.setLabelVisibilityMode(
            com.google.android.material.navigation.NavigationBarView.LABEL_VISIBILITY_LABELED
        );
        leiste.setOnItemSelectedListener(this::tabGetippt);
        behaelter.addView(leiste);

        // Der FAB liegt UEBER der Leiste, nicht darin — so sieht MD3 eine
        // hervorgehobene Aktion vor. Im Fremdplugin ragte sie in den Inhalt.
        aktionsKnopf = new FloatingActionButton(getContext());
        FrameLayout.LayoutParams knopfMasse = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.END | Gravity.BOTTOM
        );
        int rand = dp(16);
        knopfMasse.setMargins(0, 0, rand, dp(72) + rand);
        aktionsKnopf.setLayoutParams(knopfMasse);
        aktionsKnopf.setVisibility(View.GONE);
        aktionsKnopf.setOnClickListener(v -> {
            if (aktionsId != null) {
                melde(aktionsId);
            }
        });
        behaelter.addView(aktionsKnopf);

        wurzel.addView(behaelter);

        // Unterer Systemabstand (Gesten-Balken oder Navigationstasten): ohne
        // ihn laege die Leiste teilweise darunter. Der Wert kommt vom System,
        // damit beide Bedienarten stimmen.
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(
            behaelter,
            (ansicht, einfassung) -> {
                int unten = einfassung
                    .getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars())
                    .bottom;
                // Das Padding gehoert an die LEISTE, nicht an den Behaelter:
                // am Behaelter entstuende unter der Leiste eine leere Flaeche,
                // weil ihre Hintergrundfarbe dort nicht mehr hinreicht.
                leiste.setPadding(0, 0, 0, unten);
                systemAbstand = unten;
                // Der FAB muss ueber der Leiste UND ueber dem Systemabstand
                // sitzen, sonst verdeckt er den letzten Eintrag.
                FrameLayout.LayoutParams masse = (FrameLayout.LayoutParams) aktionsKnopf.getLayoutParams();
                masse.setMargins(0, 0, dp(16), dp(hoeheDp()) + unten + dp(16));
                aktionsKnopf.setLayoutParams(masse);
                meldeHoehe(hoeheDp() + alsDp(unten));
                return einfassung;
            }
        );
        androidx.core.view.ViewCompat.requestApplyInsets(behaelter);
    }

    private void setzeTabs(JSArray tabs) throws Exception {
        Menu menue = leiste.getMenu();
        menue.clear();
        tabIds.clear();
        aktionsId = null;

        JSONArray roh = tabs;
        for (int i = 0; i < roh.length(); i++) {
            JSONObject tab = roh.getJSONObject(i);
            String id = tab.optString("id", null);
            if (id == null) {
                continue;
            }
            String titel = tab.optString("title", "");
            String rolle = tab.optString("role", "normal");

            if (!"normal".equals(rolle)) {
                // Aktion statt Tab: als FAB ueber der Leiste.
                aktionsId = id;
                aktionsKnopf.setVisibility(View.VISIBLE);
                aktionsKnopf.setContentDescription(titel);
                Drawable symbol = symbolAus(svgAus(tab));
                if (symbol != null) {
                    aktionsKnopf.setImageDrawable(symbol);
                }
                continue;
            }

            int position = tabIds.size();
            MenuItem eintrag = menue.add(Menu.NONE, position, position, titel);
            tabIds.add(id);

            Drawable symbol = symbolAus(svgAus(tab));
            if (symbol != null) {
                eintrag.setIcon(symbol);
            }

            int anzahl = tab.optInt("badge", 0);
            if (anzahl > 0) {
                BadgeDrawable badge = leiste.getOrCreateBadge(position);
                badge.setNumber(anzahl);
                badge.setBackgroundColor(farbeBadge);
                badge.setBadgeTextColor(Color.WHITE);
            } else {
                leiste.removeBadge(position);
            }
        }
    }

    /**
     * Holt das SVG aus dem icon-Feld. NativeNav.js schickt es als
     * { android: { svg }, width, height } — der String ist nur der Fallback,
     * falls das Format einmal einfacher kommt.
     */
    @Nullable
    private String svgAus(JSONObject tab) {
        Object symbol = tab.opt("icon");
        if (symbol instanceof String) {
            return (String) symbol;
        }
        if (symbol instanceof JSONObject) {
            JSONObject objekt = (JSONObject) symbol;
            JSONObject android = objekt.optJSONObject("android");
            if (android != null) {
                String svg = android.optString("svg", null);
                if (svg != null && !svg.isEmpty()) {
                    return svg;
                }
            }
            String direkt = objekt.optString("svg", null);
            if (direkt != null && !direkt.isEmpty()) {
                return direkt;
            }
        }
        return null;
    }

    private void waehle(String id) {
        int index = tabIds.indexOf(id);
        if (index < 0) {
            return;
        }
        // getSelectedItemId liefert die Menue-Id. Die ist hier gleich der
        // Position, weil setzeTabs() beide gleich vergibt — der Vergleich muss
        // aber trotzdem gegen die Id laufen, nicht gegen einen Listenindex.
        auswahlId = id;
        if (leiste.getSelectedItemId() == index) {
            return;
        }
        setztSelbst = true;
        leiste.setSelectedItemId(index);
        setztSelbst = false;
    }

    /**
     * true zurueckgeben heisst: die Leiste uebernimmt die Auswahl selbst.
     *
     * Das ist hier richtig, weil NativeNav.js beim Wechsel aus der Leiste
     * bewusst KEIN selectedId zuruecksendet (Kommentar "vonNativ" dort) — es
     * geht davon aus, dass die Leiste ihren Zustand bereits umgestellt hat.
     * Wuerde hier false zurueckgegeben, bliebe die Pille auf dem alten Eintrag
     * stehen, waehrend der Inhalt schon wechselt.
     */
    private boolean tabGetippt(MenuItem eintrag) {
        if (setztSelbst) {
            return true;
        }
        int position = eintrag.getItemId();
        if (position >= 0 && position < tabIds.size()) {
            // Auswahl selbst setzen und merken: NativeNav.js schickt beim
            // Wechsel aus der Leiste bewusst KEIN selectedId zurueck
            // (Kommentar "vonNativ" dort) — es haelt die Leiste bereits fuer
            // umgestellt. Ohne diese Zeile bliebe die Pille auf dem alten
            // Eintrag stehen, waehrend der Inhalt schon gewechselt hat.
            eintrag.setChecked(true);
            auswahlId = tabIds.get(position);
            melde(auswahlId);
        }
        return true;
    }

    private void melde(String id) {
        JSObject ereignis = new JSObject();
        ereignis.put("id", id);
        notifyListeners("tabSelect", ereignis);
    }

    private void uebernimmFarben(JSObject farben) {
        farbeAktiv = farbeAus(farben.getString("tint"), farbeAktiv);
        farbeInaktiv = farbeAus(farben.getString("inactiveTint"), farbeInaktiv);
        farbeFlaeche = farbeAus(farben.getString("background"), farbeFlaeche);
        farbeIndikator = farbeAus(farben.getString("indicator"), farbeIndikator);
        farbeBadge = farbeAus(farben.getString("badgeBackground"), farbeBadge);
    }

    private void faerbe() {
        if (leiste == null) {
            return;
        }
        leiste.setBackgroundColor(farbeFlaeche);
        leiste.setItemActiveIndicatorColor(android.content.res.ColorStateList.valueOf(farbeIndikator));

        int[][] zustaende = { { android.R.attr.state_checked }, {} };
        int[] werte = { farbeAktiv, farbeInaktiv };
        android.content.res.ColorStateList liste = new android.content.res.ColorStateList(zustaende, werte);
        leiste.setItemIconTintList(liste);
        leiste.setItemTextColor(liste);

        if (aktionsKnopf != null) {
            aktionsKnopf.setBackgroundTintList(android.content.res.ColorStateList.valueOf(farbeAktiv));
            aktionsKnopf.setImageTintList(android.content.res.ColorStateList.valueOf(Color.WHITE));
        }
    }

    /**
     * Schreibt die Hoehe der Leiste als CSS-Variable an das Dokument — dasselbe,
     * was contentInsetMode 'css' im Fremdplugin tat. Ohne das laege der letzte
     * Inhalt unter der Leiste.
     */
    private void meldeHoehe(int dp) {
        String js = "document.documentElement.style.setProperty('--cap-native-tabbar-height','" + dp + "px')";
        getBridge().getWebView().post(() -> getBridge().getWebView().evaluateJavascript(js, null));
    }

    private int hoeheDp() {
        return 80;
    }

    private int alsDp(int pixel) {
        return Math.round(pixel / getContext().getResources().getDisplayMetrics().density);
    }

    /**
     * Wandelt ein Inline-SVG (wie NativeNav.js es liefert) in ein Drawable.
     *
     * Android kann zur Laufzeit kein SVG lesen — VectorDrawable entsteht nur
     * aus kompiliertem XML. Die Symbole aus lucide-react bestehen aber
     * ausschliesslich aus <path d="...">-Elementen, und dafuer genuegt
     * PathParser aus androidx: er liefert einen Path, den ein eigenes Drawable
     * mit dem Stil von lucide zeichnet (nur Kontur, Breite 2, runde Enden).
     */
    @Nullable
    private Drawable symbolAus(@Nullable String quelle) {
        if (quelle == null || quelle.isEmpty()) {
            return null;
        }
        String svg = quelle;
        if (svg.startsWith("data:")) {
            int komma = svg.indexOf(',');
            if (komma < 0) {
                return null;
            }
            String nutzlast = svg.substring(komma + 1);
            try {
                svg = svg.substring(0, komma).contains("base64")
                    ? new String(Base64.decode(nutzlast, Base64.DEFAULT), StandardCharsets.UTF_8)
                    : java.net.URLDecoder.decode(nutzlast, "UTF-8");
            } catch (Exception e) {
                return null;
            }
        }
        if (!svg.trim().startsWith("<svg")) {
            return null;
        }

        List<android.graphics.Path> pfade = new ArrayList<>();
        java.util.regex.Matcher m = PFAD_MUSTER.matcher(svg);
        while (m.find()) {
            try {
                pfade.add(androidx.core.graphics.PathParser.createPathFromPathData(m.group(1)));
            } catch (RuntimeException e) {
                // Einzelner unlesbarer Pfad darf nicht das ganze Symbol kippen.
            }
        }
        return pfade.isEmpty() ? null : new KonturSymbol(pfade, dp(24));
    }

    /** d="..." aus jedem <path>, egal ob einfache oder doppelte Anfuehrung. */
    private static final java.util.regex.Pattern PFAD_MUSTER = java.util.regex.Pattern.compile(
        "<path[^>]*\\sd=[\"']([^\"']+)[\"']"
    );

    /**
     * Zeichnet die Pfade eines lucide-Symbols als Kontur. Die Pfade stehen im
     * 24er-Koordinatensystem des SVG und werden auf die Zielkante skaliert.
     */
    private static final class KonturSymbol extends Drawable {

        private final List<android.graphics.Path> pfade;
        private final int kante;
        private final android.graphics.Paint stift = new android.graphics.Paint(
            android.graphics.Paint.ANTI_ALIAS_FLAG
        );
        private final android.graphics.Path gezeichnet = new android.graphics.Path();
        private final android.graphics.Matrix skala = new android.graphics.Matrix();

        KonturSymbol(List<android.graphics.Path> pfade, int kante) {
            this.pfade = pfade;
            this.kante = kante;
            stift.setStyle(android.graphics.Paint.Style.STROKE);
            stift.setStrokeCap(android.graphics.Paint.Cap.ROUND);
            stift.setStrokeJoin(android.graphics.Paint.Join.ROUND);
            stift.setColor(Color.BLACK);
            setBounds(0, 0, kante, kante);
        }

        @Override
        public void draw(android.graphics.Canvas leinwand) {
            android.graphics.Rect raum = getBounds();
            float faktor = Math.min(raum.width(), raum.height()) / 24f;
            if (faktor <= 0f) {
                return;
            }
            stift.setStrokeWidth(2f * faktor);
            skala.setScale(faktor, faktor);
            skala.postTranslate(raum.left, raum.top);
            for (android.graphics.Path pfad : pfade) {
                gezeichnet.reset();
                pfad.transform(skala, gezeichnet);
                leinwand.drawPath(gezeichnet, stift);
            }
        }

        @Override
        public void setTint(int farbe) {
            stift.setColor(farbe);
            invalidateSelf();
        }

        @Override
        public void setTintList(@Nullable android.content.res.ColorStateList liste) {
            if (liste != null) {
                stift.setColor(liste.getColorForState(getState(), liste.getDefaultColor()));
                invalidateSelf();
            }
        }

        @Override
        public boolean isStateful() {
            return true;
        }

        @Override
        protected boolean onStateChange(int[] zustand) {
            // Faerbung kommt ueber die ColorStateList der Leiste; ein
            // Zustandswechsel muss neu zeichnen, damit Aktiv/Inaktiv greift.
            invalidateSelf();
            return true;
        }

        @Override
        public int getIntrinsicWidth() {
            return kante;
        }

        @Override
        public int getIntrinsicHeight() {
            return kante;
        }

        @Override
        public void setAlpha(int alpha) {
            stift.setAlpha(alpha);
        }

        @Override
        public void setColorFilter(@Nullable android.graphics.ColorFilter filter) {
            stift.setColorFilter(filter);
        }

        @Override
        public int getOpacity() {
            return android.graphics.PixelFormat.TRANSLUCENT;
        }
    }

    private int farbeAus(@Nullable String wert, int ersatz) {
        if (wert == null || wert.isEmpty()) {
            return ersatz;
        }
        try {
            return Color.parseColor(wert);
        } catch (IllegalArgumentException e) {
            return ersatz;
        }
    }

    private int dp(int wert) {
        return Math.round(wert * getContext().getResources().getDisplayMetrics().density);
    }
}
