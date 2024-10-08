export const organizeOrte = (orte) => {
  const dienstort = orte.find(ort => ort.ist_dienstort);
  const wohnort = orte.find(ort => ort.ist_wohnort);
  const kirchspiele = orte.filter(ort => ort.ist_kirchspiel);
  const sonstige = orte.filter(ort => !ort.ist_dienstort && !ort.ist_wohnort && !ort.ist_kirchspiel)
    .sort((a, b) => a.name.localeCompare(b.name));
  
  return { dienstort, wohnort, kirchspiele, sonstige };
};

export const renderOrteOptions = (orte) => {
  const { dienstort, wohnort, kirchspiele, sonstige } = organizeOrte(orte);
  
  return (
    <>
      {dienstort && (
        <optgroup label="Dienstort">
          <option value={dienstort.id}>{dienstort.name}</option>
        </optgroup>
      )}
      {wohnort && (
        <optgroup label="Wohnort">
          <option value={wohnort.id}>{wohnort.name}</option>
        </optgroup>
      )}
      {kirchspiele.length > 0 && (
        <optgroup label="Kirchspiel">
          {kirchspiele.map(ort => (
            <option key={ort.id} value={ort.id}>{ort.name}</option>
          ))}
        </optgroup>
      )}
      <optgroup label="Sonstige">
        {sonstige.map(ort => (
          <option key={ort.id} value={ort.id}>{ort.name}</option>
        ))}
      </optgroup>
    </>
  );
};