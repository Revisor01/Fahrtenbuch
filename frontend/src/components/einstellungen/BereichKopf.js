import React from 'react';

// Bereichskopf mit Titel, Satz und optionalem Primärbutton.
function BereichKopf({ titel, satz, aktion, onAktion }) {
  return (
    <div className="set-head">
      <div className="set-head-text">
        <div className="set-head-titel">{titel}</div>
        {satz && <div className="set-head-satz">{satz}</div>}
      </div>
      {aktion && (
        <button type="button" className="set-head-btn" onClick={onAktion}>
          {aktion}
        </button>
      )}
    </div>
  );
}

export default BereichKopf;
