import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import './index.css';
import { AppContext } from './App';
import Modal from './Modal';

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
      <div className="card-container-highlight">
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
      <div className="flex justify-end mb-6">
      <button
      onClick={() => setIsCreateModalOpen(true)}
      className="btn-primary w-full-mobile"
      >
      + Neuer Benutzer
      </button>
      </div>
      
      <div className="table-container">
      <table className="w-full">
      <thead>
      <tr className="table-head-row">
      <th className="table-header">Benutzername</th>
      <th className="table-header-sm">E-Mail</th>
      <th className="table-header-sm">Kirchengemeinde</th>
      <th className="table-header">Status</th>
      <th className="table-header-sm">Rolle</th>
      <th className="table-header text-right">Aktionen</th>
      </tr>
      </thead>
      <tbody className="divide-y divide-primary-50 dark:divide-primary-700">
      {users.map(user => (
         <tr key={user.id} className="table-row">
         <td className="table-cell">
         <div className="flex flex-col">
         <span className="text-value">{user.username}</span>
         <span className="text-muted text-xs sm:hidden">{user.email}</span>
         </div>
         </td>
         <td className="table-cell hidden sm:table-cell">
         <span className="text-value">{user.email}</span>
         </td>
         <td className="table-cell hidden md:table-cell">
         <span className="text-value">{user.kirchengemeinde || '-'}</span>
         </td>
         <td className="table-cell">
         {user.email_verified ? (
            <span className="status-badge-primary">● Verifiziert</span>
         ) : (
            <span className="status-badge-secondary">○ Ausstehend</span>
         )}
         </td>
         <td className="table-cell hidden sm:table-cell">
         <span className={`status-badge-${user.role === 'admin' ? 'primary' : 'secondary'}`}>
         {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
         </span>
         </td>
         <td className="table-cell">
         <div className="flex justify-end gap-2">
         <button
         onClick={() => openEditModal(user)}
         className="table-action-button-primary"
         title="Bearbeiten"
         >
         ✎
         </button>
         <button
         onClick={() => {
            showNotification(
               'Benutzer löschen',
               'Möchten Sie diesen Benutzer wirklich löschen?',
               () => handleDelete(user.id),
               true
            );
         }}
         className="table-action-button-secondary"
         title="Löschen"
         >
         ×
         </button>
         </div>
         </td>
         </tr>
      ))}
      </tbody>
      </table>
      </div>
      
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