import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import './index.css';
import { AppContext } from './contexts/AppContext';
import Modal from './Modal';
import { Pencil, Trash2, CheckCircle2, AlertCircle, Plus } from 'lucide-react';

const UserForm = ({ onSubmit, isEdit, initialData, onClose }) => {
   const formRef = useRef(null);
   const [formData, setFormData] = useState(initialData || {
       username: '',
       email: '',
       role: 'user',
       fullName: '',
       iban: '',
       kirchengemeinde: '',
       kirchspiel: '',
       kirchenkreis: ''
   });

   const handleChange = (e) => {
       const { name, value } = e.target;
       setFormData(prev => ({
           ...prev,
           [name]: value
       }));
   };

   const handleSubmit = (e) => {
       e.preventDefault();
       onSubmit(formData);
   };

   return (
      <div className="card-container">
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
      <div>
      <input
      type="email"
      name="email"
      value={formData.email}
      onChange={handleChange}
      className="form-input"
      placeholder="E-Mail *"
      required
      />
      </div>
      
      <div>
      <input
      type="text"
      name="username"
      value={formData.username}
      onChange={handleChange}
      className="form-input"
      placeholder="Benutzername *"
      required
      />
      </div>
      
      <div>
      <select
      name="role"
      value={formData.role}
      onChange={handleChange}
      className="form-select"
      >
      <option value="user">Benutzer</option>
      <option value="admin">Administrator</option>
      </select>
      </div>
      
      <div>
      <input
      type="text"
      name="fullName"
      value={formData.fullName}
      onChange={handleChange}
      className="form-input"
      placeholder="Voller Name"
      />
      </div>
      
      <div>
      <input
      type="text"
      name="iban"
      value={formData.iban}
      onChange={handleChange}
      className="form-input"
      placeholder="IBAN"
      />
      </div>
      
      <div>
      <input
      type="text"
      name="kirchengemeinde"
      value={formData.kirchengemeinde}
      onChange={handleChange}
      className="form-input"
      placeholder="Kirchengemeinde"
      />
      </div>
      
      <div>
      <input
      type="text"
      name="kirchspiel"
      value={formData.kirchspiel}
      onChange={handleChange}
      className="form-input"
      placeholder="Kirchspiel"
      />
      </div>
      
      <div>
      <input
      type="text"
      name="kirchenkreis"
      value={formData.kirchenkreis}
      onChange={handleChange}
      className="form-input"
      placeholder="Kirchenkreis"
      />
      </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2">
      <button
      type="button"
      onClick={onClose}
      className="btn-secondary w-full"
      >
      Abbrechen
      </button>
      <button
      type="submit"
      className="btn-primary w-full"
      >
      {isEdit ? 'Aktualisieren' : 'Erstellen'}
      </button>
      </div>
      </form>
      </div>
   );
};

export default function UserManagement() {
   const { showNotification } = useContext(AppContext);
   const [users, setUsers] = useState([]);
   const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
   const [selectedUser, setSelectedUser] = useState(null);

   useEffect(() => {
       fetchUsers();
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
           setIsCreateModalOpen(false);
           fetchUsers();
       } catch (error) {
           console.error('Fehler beim Erstellen des Benutzers:', error);
           showNotification('Fehler', error.response?.data?.message || 'Benutzer konnte nicht erstellt werden');
       }
   };

   const handleEdit = async (formData) => {
       try {
           await axios.put(`/api/users/${selectedUser.id}`, formData);
           showNotification('Erfolg', 'Benutzer wurde aktualisiert');
           setIsEditModalOpen(false);
           setSelectedUser(null);
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

   const openEditModal = (user) => {
       setSelectedUser({
           ...user,
           fullName: user.full_name
       });
       setIsEditModalOpen(true);
   };

   return (
      <div className="w-full max-w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-value">{users.length} Benutzer</h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary flex items-center gap-1"
        >
          <Plus size={16} />
          <span>Neuer Benutzer</span>
        </button>
      </div>

      {users.length === 0 ? (
        <div className="card-container text-center py-12">
          <p className="text-label text-sm">Keine Benutzer vorhanden</p>
          <p className="text-muted text-xs mt-1">Erstelle einen neuen Benutzer ueber den Button oben.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(user => {
            const initialen = (user.username || '??').slice(0, 2).toUpperCase();
            const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;
            const isOwnUser = user.id === currentUserId;

            return (
              <div key={user.id} className="card-container hover:shadow-card-hover transition-shadow">
                <div className="flex items-start gap-3">
                  {/* Avatar mit Initialen */}
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200 font-semibold flex items-center justify-center shrink-0 text-sm">
                    {initialen}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-value truncate">{user.username}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                        user.role === 'admin'
                          ? 'bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200'
                          : 'bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'Benutzer'}
                      </span>
                    </div>
                    <p className="text-xs text-label truncate mt-0.5">{user.email}</p>
                    {user.kirchengemeinde && (
                      <p className="text-xs text-label truncate">{user.kirchengemeinde}</p>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mt-3">
                  {user.email_verified ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={12} />
                      Verifiziert
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400">
                      <AlertCircle size={12} />
                      Nicht verifiziert
                    </span>
                  )}
                </div>

                {/* Aktionen */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-card">
                  <button
                    onClick={() => openEditModal(user)}
                    className="btn-secondary flex items-center gap-1 text-xs"
                    aria-label="Benutzer bearbeiten"
                  >
                    <Pencil size={13} />
                    <span>Bearbeiten</span>
                  </button>
                  {!isOwnUser && (
                    <button
                      onClick={() => {
                        showNotification(
                          'Benutzer loeschen',
                          `Moechtest du ${user.username} wirklich loeschen?`,
                          () => handleDelete(user.id),
                          true
                        );
                      }}
                      className="btn-destructive flex items-center gap-1 text-xs"
                      aria-label="Benutzer loeschen"
                    >
                      <Trash2 size={13} />
                      <span>Loeschen</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <Modal
      isOpen={isCreateModalOpen}
      onClose={() => setIsCreateModalOpen(false)}
      title="Neuen Benutzer erstellen"
      size="compact"
      >
      <UserForm 
      onSubmit={handleCreate} 
      isEdit={false}
      onClose={() => setIsCreateModalOpen(false)}
      />
      </Modal>
      
      <Modal
      isOpen={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      title="Benutzer bearbeiten"
      size="compact"
      >
      <UserForm 
      onSubmit={handleEdit} 
      isEdit={true} 
      initialData={selectedUser}
      onClose={() => setIsEditModalOpen(false)}
      />
      </Modal>
      </div>
   );
}