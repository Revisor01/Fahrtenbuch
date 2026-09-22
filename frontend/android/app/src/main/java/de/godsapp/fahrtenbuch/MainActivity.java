package de.godsapp.fahrtenbuch;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Eigene Plugins muessen VOR super.onCreate registriert sein, sonst
        // baut die Bruecke sie nicht mit auf.
        registerPlugin(MaterialNavPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
