import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AppContext } from './App';
import Modal from './Modal';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/solid';


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
               <div className="flex flex-col">
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
                <div className="flex flex-col">
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

                <div className="flex flex-col">
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
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700">Voller Name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                    />
                </div>
                
                <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700">IBAN</label>
                    <input
                        type="text"
                        name="iban"
                        value={formData.iban}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                    />
                </div>
                <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700">Kirchengemeinde</label>
                    <input
                        type="text"
                        name="kirchengemeinde"
                        value={formData.kirchengemeinde}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                    />
                </div>
                 <div className="flex flex-col">
                    <label className="block text-sm font-medium text-gray-700">Kirchspiel</label>
                    <input
                        type="text"
                        name="kirchspiel"
                        value={formData.kirchspiel}
                        onChange={handleChange}
                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
                    />
                </div>
                <div className="flex flex-col">
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
       setSelectedUser({
          ...user,
          fullName: user.full_name
       });
        setIsEditModalOpen(true);
    };
    
   const renderStatus = (email_verified) => {
    if (email_verified === 1) {
      return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Verifiziert</span>;
    }
       return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Nicht verifiziert</span>;
   }


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
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-sm font-medium">Benutzername</th>
                                <th className="px-3 py-2 text-sm font-medium">E-Mail</th>
                                 <th className="px-3 py-2 text-sm font-medium">Kirchengemeinde</th>
                                <th className="px-3 py-2 text-sm font-medium">Rolle</th>
                                 <th className="px-3 py-2 text-sm font-medium">Status</th>
                                <th className="px-3 py-2 text-sm font-medium w-24">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="border px-3 py-2 text-sm">{user.username}</td>
                                    <td className="border px-3 py-2 text-sm">{user.email}</td>
                                    <td className="border px-3 py-2 text-sm">{user.kirchengemeinde || '-'}</td>
                                    <td className="border px-3 py-2 text-sm">
                                       <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                           user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                      }`}>
                                           {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                                       </span>
                                     </td>
                                      <td className="border px-3 py-2 text-sm">
                                       {renderStatus(user.email_verified)}
                                    </td>
                                    <td className="border px-3 py-2 text-sm space-x-1">
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="text-indigo-600 hover:text-indigo-900 text-xs"
                                        >
                                           <PencilIcon className="h-4 w-4 inline-block align-middle" />
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
                                            className="text-red-600 hover:text-red-900 text-xs"
                                        >
                                            <TrashIcon className="h-4 w-4 inline-block align-middle" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
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