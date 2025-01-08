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
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                        E-Mail <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                        Benutzername <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Rolle</label>
                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="user">Benutzer</option>
                        <option value="admin">Administrator</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Voller Name</label>
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">IBAN</label>
                    <input
                        type="text"
                        name="iban"
                        value={formData.iban}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Kirchengemeinde</label>
                    <input
                        type="text"
                        name="kirchengemeinde"
                        value={formData.kirchengemeinde}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Kirchspiel</label>
                    <input
                        type="text"
                        name="kirchspiel"
                        value={formData.kirchspiel}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Kirchenkreis</label>
                    <input
                        type="text"
                        name="kirchenkreis"
                        value={formData.kirchenkreis}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>
            <div className="mt-6">
                <button
                    type="submit"
                    className="w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 transition duration-200"
                >
                    {isEdit ? 'Aktualisieren' : 'Erstellen'}
                </button>
            </div>
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

    return (
        <div className="w-full max-w-full p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Benutzerverwaltung</h2>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-100 text-blue-700 px-6 py-3 rounded-md hover:bg-blue-200 transition duration-200 w-full sm:w-auto text-sm"
                >
                    + Neuer Benutzer
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm w-full">
                <div className="overflow-x-auto w-full">
                    <table className="w-full">
                        <thead className="sm:table-header-group hidden">
                            <tr className="bg-gray-50 border-b">
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Benutzername</th>
                                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Mail</th>
                                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kirchengemeinde</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rolle</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        <div className="flex flex-col">
                                            <span>{user.username}</span>
                                            <span className="text-xs text-gray-500 sm:hidden">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{user.email}</td>
                                    <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{user.kirchengemeinde || '-'}</td>
                                    <td className="px-4 py-3 text-sm">
                                        {user.email_verified ? (
                                            <span className="text-green-600 text-xs">● Verifiziert</span>
                                        ) : (
                                            <span className="text-yellow-600 text-xs">○ Ausstehend</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-sm hidden sm:table-cell">
                                        <span className={`text-xs ${user.role === 'admin' ? 'text-purple-600' : 'text-blue-600'}`}>
                                            {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right">
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
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
                                            className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded ml-2 hover:bg-red-200"
                                            title="Löschen"
                                        >
                                            ×
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