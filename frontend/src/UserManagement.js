import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import './index.css';
import { AppContext } from './contexts/AppContext';
import Sheet from './components/ui/Sheet';
import EmptyState from './components/ui/EmptyState';
import BereichKopf from './components/einstellungen/BereichKopf';
import { Pencil, Trash2, Users } from 'lucide-react';

// Verwaltung (Admin) nach Design-Spec Screen 7: Benutzer als Tabelle
// (Kopf 11px/700 uppercase auf --bg, Zeilen mit --line-Trennung, Hover
// --surface-2, Aktions-Icons 36×36) statt Kacheln; mobil gestapelte
// Zeilen (.set-row). Formulare öffnen als Sheet.

const FELDER = [
  { name: 'email', label: 'E-Mail', type: 'email', required: true },
  { name: 'username', label: 'Benutzername', type: 'text', required: true },
  { name: 'fullName', label: 'Voller Name', type: 'text' },
  { name: 'iban', label: 'IBAN', type: 'text' },
  { name: 'kirchengemeinde', label: 'Kirchengemeinde', type: 'text' },
  { name: 'kirchspiel', label: 'Kirchspiel', type: 'text' },
  { name: 'kirchenkreis', label: 'Kirchenkreis', type: 'text' },
];

function BenutzerSheet({ offen, isEdit, initialData, onClose, onSubmit }) {
  const [formData, setFormData] = useState(initialData || {
    username: '',
    email: '',
    role: 'user',
    fullName: '',
    iban: '',
    kirchengemeinde: '',
    kirchspiel: '',
    kirchenkreis: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Sheet
      isOpen={offen}
      onClose={onClose}
      title={isEdit ? 'Benutzer bearbeiten' : 'Benutzer anlegen'}
    >
      <form onSubmit={handleSubmit} className="set-sheet-form">
        {FELDER.slice(0, 2).map(({ name, label, type, required }) => (
          <div key={name}>
            <label className="form-label" htmlFor={`benutzer-${name}`}>
              {label}{required ? ' *' : ''}
            </label>
            <input
              id={`benutzer-${name}`}
              type={type}
              name={name}
              value={formData[name] || ''}
              onChange={handleChange}
              className="form-input"
              required={required}
            />
          </div>
        ))}
        <div>
          <label className="form-label" htmlFor="benutzer-role">Rolle</label>
          <select
            id="benutzer-role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="form-select"
          >
            <option value="user">Benutzer</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
        {FELDER.slice(2).map(({ name, label, type }) => (
          <div key={name}>
            <label className="form-label" htmlFor={`benutzer-${name}`}>{label}</label>
            <input
              id={`benutzer-${name}`}
              type={type}
              name={name}
              value={formData[name] || ''}
              onChange={handleChange}
              className="form-input"
            />
          </div>
        ))}
        <div className="set-sheet-buttons">
          <button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn-primary">
            {isEdit ? 'Aktualisieren' : 'Erstellen'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

export default function UserManagement() {
  const { showNotification, user: currentUser } = useContext(AppContext);
  const [users, setUsers] = useState([]);
  // null | { mode: 'neu' } | { mode: 'edit', user }
  const [sheet, setSheet] = useState(null);
  // Inline-Zweischritt statt Bestätigungs-Modal: erster Klick „scharf",
  // zweiter Klick löscht (kein Undo möglich — Nutzerkonto samt Daten)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const confirmTimer = useRef(null);

  const currentUserId = currentUser?.id
    ?? JSON.parse(localStorage.getItem('user') || '{}').id;

  const requestDelete = (userId) => {
    if (confirmingDeleteId === userId) {
      clearTimeout(confirmTimer.current);
      setConfirmingDeleteId(null);
      handleDelete(userId);
      return;
    }
    setConfirmingDeleteId(userId);
    clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirmingDeleteId(null), 4000);
  };

  useEffect(() => {
    fetchUsers();
    return () => clearTimeout(confirmTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der Benutzer:', error);
      showNotification('Fehler', 'Benutzer konnten nicht geladen werden');
    }
  };

  const handleCreate = async (formData) => {
    try {
      await axios.post('/api/users', formData);
      showNotification('Erfolg', 'Benutzer wurde erstellt. Eine E-Mail mit Anweisungen wurde versendet.');
      setSheet(null);
      fetchUsers();
    } catch (error) {
      console.error('Fehler beim Erstellen des Benutzers:', error);
      showNotification('Fehler', error.response?.data?.message || 'Benutzer konnte nicht erstellt werden');
    }
  };

  const handleEdit = async (formData) => {
    try {
      await axios.put(`/api/users/${sheet.user.id}`, formData);
      showNotification('Erfolg', 'Benutzer wurde aktualisiert');
      setSheet(null);
      fetchUsers();
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Benutzers:', error);
      showNotification('Fehler', error.response?.data?.message || 'Benutzer konnte nicht aktualisiert werden');
    }
  };

  const handleDelete = async (userId) => {
    try {
      await axios.delete(`/api/users/${userId}`);
      showNotification('Erfolg', 'Benutzer wurde gelöscht');
      fetchUsers();
    } catch (error) {
      console.error('Fehler beim Löschen des Benutzers:', error);
      showNotification('Fehler', error.response?.data?.message || 'Benutzer konnte nicht gelöscht werden');
    }
  };

  const openEdit = (user) => {
    setSheet({ mode: 'edit', user: { ...user, fullName: user.full_name } });
  };

  const renderAktionen = (user) => {
    const isOwnUser = user.id === currentUserId;
    return (
      <div className="set-td-aktionen">
        <button
          type="button"
          className="set-action"
          onClick={() => openEdit(user)}
          title="Bearbeiten"
          aria-label={`${user.username} bearbeiten`}
        >
          <Pencil size={14} />
        </button>
        {!isOwnUser && (
          confirmingDeleteId === user.id ? (
            <button
              type="button"
              className="set-action set-action-confirm"
              onClick={() => requestDelete(user.id)}
              aria-label={`${user.username} endgültig löschen`}
            >
              Sicher?
            </button>
          ) : (
            <button
              type="button"
              className="set-action set-action-danger"
              onClick={() => requestDelete(user.id)}
              title="Löschen"
              aria-label={`${user.username} löschen`}
            >
              <Trash2 size={15} />
            </button>
          )
        )}
      </div>
    );
  };

  const renderVerif = (user) => (
    <span className={`set-verif ${user.email_verified ? 'is-ok' : 'is-offen'}`}>
      {user.email_verified ? 'Verifiziert' : 'Nicht verifiziert'}
    </span>
  );

  return (
    <div className="w-full max-w-full">
      <BereichKopf
        titel="Benutzer"
        satz={`${users.length} ${users.length === 1 ? 'Konto' : 'Konten'} — neue Benutzer erhalten eine E-Mail zum Setzen des Passworts.`}
        aktion="+ Benutzer"
        onAktion={() => setSheet({ mode: 'neu' })}
      />

      {users.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="Noch keine Benutzer"
          text="Lege das erste Konto an — die Person erhält eine E-Mail zum Setzen des Passworts."
          actionLabel="+ Benutzer"
          onAction={() => setSheet({ mode: 'neu' })}
        />
      ) : (
        <>
          {/* Desktop: Tabelle nach Spec Screen 7 („Orte"-Muster) */}
          <div className="set-table set-table-desktop">
            <div className="set-th-row set-grid-benutzer">
              <div>Benutzer</div>
              <div>E-Mail</div>
              <div>Rolle</div>
              <div style={{ textAlign: 'right' }}>Aktionen</div>
            </div>
            {users.map((user) => (
              <div key={user.id} className="set-tr set-tr-hover set-grid-benutzer">
                <div style={{ minWidth: 0 }}>
                  <div className="set-td-haupt">{user.username}</div>
                  {(user.full_name || user.kirchengemeinde) && (
                    <span className="set-td-sub">{user.full_name || user.kirchengemeinde}</span>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="set-td-text">{user.email}</div>
                  {renderVerif(user)}
                </div>
                <div className="set-td-text">
                  {user.role === 'admin' ? 'Admin' : 'Benutzer'}
                </div>
                {renderAktionen(user)}
              </div>
            ))}
          </div>

          {/* Mobil: gestapelte Zeilen */}
          <div className="set-liste-mobil">
            {users.map((user) => (
              <div key={user.id} className="set-row">
                <div className="set-row-main">
                  <div className="set-row-titel">{user.username}</div>
                  <div className="set-row-sub">{user.email}</div>
                  <div className="set-row-sub">
                    {user.role === 'admin' ? 'Admin' : 'Benutzer'}
                    {' · '}
                    {renderVerif(user)}
                  </div>
                </div>
                {renderAktionen(user)}
              </div>
            ))}
          </div>
        </>
      )}

      {sheet && (
        <BenutzerSheet
          offen
          isEdit={sheet.mode === 'edit'}
          initialData={sheet.mode === 'edit' ? sheet.user : null}
          onClose={() => setSheet(null)}
          onSubmit={sheet.mode === 'edit' ? handleEdit : handleCreate}
        />
      )}
    </div>
  );
}
