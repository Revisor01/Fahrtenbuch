import React from 'react';

// Bereichskopf nach Spec Screen 7: Titel 17px/600 + erklärender Satz 14px,
// rechts optional Primärbutton „+ {Ding}"
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
