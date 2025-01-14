import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import './index.css';
import { AppContext } from './App';
import Modal from './Modal';

    const UserForm = ({ onSubmit, isEdit, initialData }) => {
        const inputClasses = "w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-sm";
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
            <div className="table-container">
            <div className="bg-primary-25 p-6 rounded-lg">
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
            <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="form-input"
            placeholder="E-Mail *"
            required
            />
            
            <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className="form-input"
            placeholder="Benutzername *"
            required
            />
            
            <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="form-select"
            >
            <option value="user">Benutzer</option>
            <option value="admin">Administrator</option>
            </select>
            
            <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            className="form-input"
            placeholder="Voller Name"
            />
            
            <input
            type="text"
            name="iban"
            value={formData.iban}
            onChange={handleChange}
            className="form-input"
            placeholder="IBAN"
            />
            
            <input
            type="text"
            name="kirchengemeinde"
            value={formData.kirchengemeinde}
            onChange={handleChange}
            className="form-input"
            placeholder="Kirchengemeinde"
            />
            
            <input
            type="text"
            name="kirchspiel"
            value={formData.kirchspiel}
            onChange={handleChange}
            className="form-input"
            placeholder="Kirchspiel"
            />
            
            <input
            type="text"
            name="kirchenkreis"
            value={formData.kirchenkreis}
            onChange={handleChange}
            className="form-input"
            placeholder="Kirchenkreis"
            />
            </div>
            
            <button
            type="submit"
            className="btn-primary w-full"
            >
            {isEdit ? 'Aktualisieren' : 'Erstellen'}
            </button>
            </form>
            </div>
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
        <div className="-mx-0 sm:mx-0 overflow-auto">
        <table className="min-w-full">
        <thead>
        <tr className="bg-primary-25 border-b border-primary-100">
        <th className="table-header">Benutzername</th>
        <th className="table-header-sm">E-Mail</th>
        <th className="hidden md:table-cell table-header">Kirchengemeinde</th>
        <th className="table-header">Status</th>
        <th className="table-header-sm">Rolle</th>
        <th className="table-header text-right">Aktionen</th>
        </tr>
        </thead>
        <tbody className="divide-y divide-primary-50">
        {users.map(user => (
            <tr key={user.id} className="table-row">
            <td className="table-cell">
            <div className="flex flex-col">
            <span>{user.username}</span>
            <span className="text-xs text-primary-500 sm:hidden">{user.email}</span>
            </div>
            </td>
            <td className="table-cell hidden sm:table-cell">{user.email}</td>
            <td className="table-cell hidden md:table-cell">{user.kirchengemeinde || '-'}</td>
            <td className="table-cell">
            {user.email_verified ? (
                <span className="text-primary-600 text-xs">● Verifiziert</span>
            ) : (
                <span className="text-secondary-500 text-xs">○ Ausstehend</span>
            )}
            </td>
            <td className="table-cell hidden sm:table-cell">
            <span className={`text-xs ${user.role === 'admin' ? 'text-primary-700' : 'text-primary-600'}`}>
            {user.role === 'admin' ? 'Administrator' : 'Benutzer'}
            </span>
            </td>
            <td className="table-cell">
            <div className="flex flex-col sm:flex-row items-end gap-2">
            <button
            onClick={() => openEditModal(user)}
            className="bg-primary-500 text-white h-8 w-8 rounded flex items-center justify-center hover:bg-primary-600 transition-colors duration-150"
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
            className="bg-secondary-400 text-white h-8 w-8 rounded flex items-center justify-center hover:bg-secondary-500 transition-colors duration-150"
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
        </div>
        
        <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Neuen Benutzer erstellen"
        size="compact"
        >
        <UserForm onSubmit={handleCreate} isEdit={false} />
        </Modal>
        
        <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Benutzer bearbeiten"
        size="compact"
        >
        <UserForm onSubmit={handleEdit} isEdit={true} initialData={selectedUser} />
        </Modal>
        </div>
    );
}