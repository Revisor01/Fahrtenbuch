import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AppContext } from './App';
import Modal from './Modal';

const UserForm = ({ onSubmit, isEdit, initialData }) => {
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
       <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                   <label className="block text-sm font-medium text-gray-700">
                       E-Mail <span className="text-red-500">*</span>
                   </label>
                   <input
                       type="email"
                       name="email"
                       value={formData.email}
                       onChange={handleChange}
                       className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                       required
                   />
               </div>
               <div>
                   <label className="block text-sm font-medium text-gray-700">
                       Benutzername <span className="text-red-500">*</span>
                   </label>
                   <input
                       type="text"
                       name="username"
                       value={formData.username}
                       onChange={handleChange}
                       className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                       required
                   />
               </div>
               
               <div>
                   <label className="block text-sm font-medium text-gray-700">Rolle</label>
                   <select
                       name="role"
                       value={formData.role}
                       onChange={handleChange}
                       className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                   >
                       <option value="user">Benutzer</option>
                       <option value="admin">Administrator</option>
                   </select>
               </div>
               <div>
                   <label className="block text-sm font-medium text-gray-700">Voller Name</label>
                   <input
                       type="text"
                       name="fullName"
                       value={formData.fullName}
                       onChange={handleChange}
                       className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                   />
               </div>
               <div>
                   <label className="block text-sm font-medium text-gray-700">IBAN</label>
                   <input
                       type="text"
                       name="iban"
                       value={formData.iban}
                       onChange={handleChange}
                       className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                   />
               </div>
               <div>
                   <label className="block text-sm font-medium text-gray-700">Kirchengemeinde</label>
                   <input
                       type="text"
                       name="kirchengemeinde"
                       value={formData.kirchengemeinde}
                       onChange={handleChange}
                       className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                   />
               </div>
               <div>
                   <label className="block text-sm font-medium text-gray-700">Kirchspiel</label>
                   <input
                       type="text"
                       name="kirchspiel"
                       value={formData.kirchspiel}
                       onChange={handleChange}
                       className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                   />
               </div>
               <div>
                   <label className="block text-sm font-medium text-gray-700">Kirchenkreis</label>
                   <input
                       type="text"
                       name="kirchenkreis"
                       value={formData.kirchenkreis}
                       onChange={handleChange}
                       className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                   />
               </div>
           </div>
           <button
               type="submit"
               className="w-full bg-blue-500 text-white rounded-md p-2 hover:bg-blue-600 mt-6"
           >
               {isEdit ? 'Aktualisieren' : 'Erstellen'}
           </button>
       </form>
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
       setSelectedUser(user);
       setIsEditModalOpen(true);
   };

   return (
       <div className="p-4">
           <div className="flex justify-between items-center mb-4">
               <h2 className="text-xl font-bold">Benutzerverwaltung</h2>
               <button
                   onClick={() => setIsCreateModalOpen(true)}
                   className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
               >
                   Neuen Benutzer erstellen
               </button>
           </div>

           <div className="bg-white rounded-lg shadow overflow-hidden">
               <table className="min-w-full">
                   <thead className="bg-gray-50">
                       <tr>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                               Benutzername
                           </th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                               E-Mail
                           </th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                               Kirchengemeinde
                           </th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                               Rolle
                           </th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                               Status
                           </th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                               Aktionen
                           </th>
                       </tr>
                   </thead>
                   <tbody>
                       {users.map((user) => (
                           <tr key={user.id}>
                               <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                               <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                               <td className="px-6 py-4 whitespace-nowrap">{user.kirchengemeinde || '-'}</td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                   <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                       user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                   }`}>
                                       {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                                   </span>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                   <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                       user.email_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                   }`}>
                                       {user.email_verified ? 'Verifiziert' : 'Nicht verifiziert'}
                                   </span>
                               </td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                   <button
                                       onClick={() => openEditModal(user)}
                                       className="text-indigo-600 hover:text-indigo-900"
                                   >
                                       Bearbeiten
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
                                       className="text-red-600 hover:text-red-900"
                                   >
                                       Löschen
                                   </button>
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
           >
               <UserForm onSubmit={handleCreate} isEdit={false} />
           </Modal>

           <Modal
               isOpen={isEditModalOpen}
               onClose={() => setIsEditModalOpen(false)}
               title="Benutzer bearbeiten"
           >
               <UserForm onSubmit={handleEdit} isEdit={true} initialData={selectedUser} />
           </Modal>
       </div>
   );
}