import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';

const TABS = ['Create Organizer', 'Manage Organizers', 'Password Reset Requests'];
const TAB_QUERY_MAP = { manage: 'Manage Organizers', password: 'Password Reset Requests' };

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('Create Organizer');

    // Sync tab from ?tab= query param (used by navbar links)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tabKey = params.get('tab');
        if (tabKey && TAB_QUERY_MAP[tabKey]) setActiveTab(TAB_QUERY_MAP[tabKey]);
    }, [location.search]);

    const [organizerData, setOrganizerData] = useState({
        organizerName: '', emailPrefix: '', category: 'Technical',
        contactNumber: '', description: '', website: ''
    });
    const [generatedCreds, setGeneratedCreds] = useState(null);

    const [organizers, setOrganizers] = useState([]);
    const [orgLoading, setOrgLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const [resetRequests, setResetRequests] = useState([]);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetNotes, setResetNotes] = useState({});
    const [approvedCred, setApprovedCred] = useState(null);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (!storedUser || !storedUser.token) {
            navigate('/login');
        } else if (storedUser.role !== 'admin') {
            toast.error('Access Denied: Admins only');
            navigate('/dashboard');
        } else {
            setUser(storedUser);
        }
    }, [navigate]);

    useEffect(() => {
        if (user && activeTab === 'Manage Organizers') fetchOrganizers();
        if (user && activeTab === 'Password Reset Requests') fetchResetRequests();
    }, [user, activeTab]);

    const getConfig = (u) => ({
        headers: { Authorization: `Bearer ${u.token}` }
    });

    const fetchOrganizers = async () => {
        setOrgLoading(true);
        try {
            const res = await axios.get(import.meta.env.VITE_API_URL + '/api/admin/organizers', getConfig(user));
            setOrganizers(res.data);
        } catch {
            toast.error('Failed to load organizers');
        } finally {
            setOrgLoading(false);
        }
    };

    const fetchResetRequests = async () => {
        setResetLoading(true);
        try {
            const res = await axios.get(import.meta.env.VITE_API_URL + '/api/admin/password-reset-requests', getConfig(user));
            setResetRequests(res.data);
        } catch {
            toast.error('Failed to load password reset requests');
        } finally {
            setResetLoading(false);
        }
    };

    const handleResetApprove = async (reqId) => {
        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/password-reset-requests/${reqId}/approve`, {}, getConfig(user));
            setApprovedCred({ email: res.data.organizerEmail, password: res.data.newPassword });
            await fetchResetRequests();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Approval failed');
        }
    };

    const handleResetReject = async (reqId) => {
        const note = resetNotes[reqId] || '';
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/password-reset-requests/${reqId}/reject`, { adminNote: note }, getConfig(user));
            toast.success('Request rejected');
            await fetchResetRequests();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Rejection failed');
        }
    };

    const onCreateOrganizer = async (e) => {
        e.preventDefault();
        if (!organizerData.emailPrefix.trim()) return toast.error('Email prefix is required');
        const email = `${organizerData.emailPrefix.trim()}@clubs.iiit.ac.in`;
        const payload = { ...organizerData, email };
        delete payload.emailPrefix;
        try {
            const res = await axios.post(import.meta.env.VITE_API_URL + '/api/admin/create-organizer', payload, getConfig(user));
            toast.success('Organizer created!');
            setGeneratedCreds(res.data.organizer);
            setOrganizerData({ organizerName: '', emailPrefix: '', category: 'Technical', contactNumber: '', description: '', website: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create organizer');
        }
    };

    const handleToggleDisable = async (org) => {
        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL}/api/admin/organizers/${org._id}/disable`, {}, getConfig(user));
            toast.success(res.data.message);
            setOrganizers(prev => prev.map(o => o._id === org._id ? { ...o, isDisabled: res.data.isDisabled } : o));
        } catch {
            toast.error('Action failed');
        }
    };

    const handleDelete = async (orgId) => {
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL}/api/admin/organizers/${orgId}`, getConfig(user));
            toast.success('Organizer permanently deleted');
            setOrganizers(prev => prev.filter(o => o._id !== orgId));
            setConfirmDelete(null);
        } catch {
            toast.error('Delete failed');
        }
    };

    if (!user) return <div className="text-center mt-10 text-gray-500">Loading...</div>;

    return (
        <div className="max-w-5xl mx-auto p-6 my-8">
            <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

            {/* Tabs */}
            <div className="flex border-b mb-6">
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 text-sm font-semibold border-b-2 transition -mb-px ${
                            activeTab === tab
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* ── Tab: Create Organizer ── */}
            {activeTab === 'Create Organizer' && (
                <div className="max-w-xl">
                    <p className="text-sm text-gray-500 mb-6">
                        Create a new club/organizer account. The system auto-generates a password — share the credentials with the club.
                    </p>
                    <form onSubmit={onCreateOrganizer} className="space-y-4">
                        <div>
                            <label className="block font-semibold mb-1 text-sm">Club / Organizer Name</label>
                            <input type="text" value={organizerData.organizerName}
                                onChange={e => setOrganizerData({ ...organizerData, organizerName: e.target.value })}
                                required className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block font-semibold mb-1 text-sm">Official Email</label>
                            <div className="flex items-center">
                                <input type="text" value={organizerData.emailPrefix}
                                    onChange={e => setOrganizerData({ ...organizerData, emailPrefix: e.target.value })}
                                    required className="flex-1 p-2 border rounded-l" placeholder="club-name" />
                                <span className="bg-gray-100 border border-l-0 rounded-r px-3 py-2 text-sm text-gray-600 whitespace-nowrap">@clubs.iiit.ac.in</span>
                            </div>
                        </div>
                        <div>
                            <label className="block font-semibold mb-1 text-sm">Category</label>
                            <select value={organizerData.category}
                                onChange={e => setOrganizerData({ ...organizerData, category: e.target.value })}
                                className="w-full p-2 border rounded bg-white">
                                {['Technical', 'Cultural', 'Sports', 'Social Service', 'Academic', 'Other'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block font-semibold mb-1 text-sm">Contact Number</label>
                            <input type="text" value={organizerData.contactNumber}
                                onChange={e => setOrganizerData({ ...organizerData, contactNumber: e.target.value })}
                                className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block font-semibold mb-1 text-sm">Description</label>
                            <textarea value={organizerData.description}
                                onChange={e => setOrganizerData({ ...organizerData, description: e.target.value })}
                                rows="3" className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block font-semibold mb-1 text-sm">Website (optional)</label>
                            <input type="text" value={organizerData.website}
                                onChange={e => setOrganizerData({ ...organizerData, website: e.target.value })}
                                className="w-full p-2 border rounded" placeholder="https://..." />
                        </div>
                        <button type="submit"
                            className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition">
                            Create Organizer
                        </button>
                    </form>

                    {generatedCreds && (
                        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
                            <p className="font-bold text-green-800 mb-2">Account created — share these credentials:</p>
                            <p className="text-sm"><span className="font-semibold">Email:</span> {generatedCreds.email}</p>
                            <p className="text-sm"><span className="font-semibold">Password:</span> {generatedCreds.password}</p>
                            <p className="text-xs text-gray-500 mt-2">Share this securely. The organizer can change their password after first login.</p>
                            <button onClick={() => setGeneratedCreds(null)}
                                className="mt-3 text-xs px-3 py-1 border rounded hover:bg-green-100">
                                Dismiss
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Manage Organizers ── */}
            {activeTab === 'Manage Organizers' && (
                <div>
                    {orgLoading ? (
                        <p className="text-gray-500 text-sm">Loading...</p>
                    ) : organizers.length === 0 ? (
                        <p className="text-gray-500 text-sm">No organizers found.</p>
                    ) : (
                        <div className="border rounded overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Email</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {organizers.map(org => (
                                        <tr key={org._id} className={org.isDisabled ? 'bg-red-50' : 'bg-white'}>
                                            <td className="px-4 py-3 font-medium">{org.organizerName}</td>
                                            <td className="px-4 py-3 text-gray-500">{org.email}</td>
                                            <td className="px-4 py-3 text-gray-500">{org.category || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                                    org.isDisabled
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-green-100 text-green-700'
                                                }`}>
                                                    {org.isDisabled ? 'Disabled' : 'Active'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleToggleDisable(org)}
                                                        className={`text-xs px-3 py-1 rounded border font-semibold transition ${
                                                            org.isDisabled
                                                                ? 'border-green-400 text-green-700 hover:bg-green-50'
                                                                : 'border-yellow-400 text-yellow-700 hover:bg-yellow-50'
                                                        }`}
                                                    >
                                                        {org.isDisabled ? 'Re-enable' : 'Disable'}
                                                    </button>
                                                    {confirmDelete === org._id ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleDelete(org._id)}
                                                                className="text-xs px-3 py-1 rounded bg-red-500 text-white font-semibold hover:bg-red-600"
                                                            >
                                                                Confirm
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDelete(null)}
                                                                className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            onClick={() => setConfirmDelete(org._id)}
                                                            className="text-xs px-3 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 font-semibold"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Password Reset Requests ── */}
            {activeTab === 'Password Reset Requests' && (
                <div className="space-y-5">
                    {approvedCred && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                            <p className="font-bold text-green-800 mb-2">Password reset approved — share these credentials securely:</p>
                            <p className="text-sm"><span className="font-semibold">Email:</span> {approvedCred.email}</p>
                            <p className="text-sm"><span className="font-semibold">New Password:</span> {approvedCred.password}</p>
                            <p className="text-xs text-gray-500 mt-1">This auto-generated password is shown only once. The organizer can change it after login.</p>
                            <button onClick={() => setApprovedCred(null)} className="mt-2 text-xs px-3 py-1 border rounded hover:bg-green-100">
                                Dismiss
                            </button>
                        </div>
                    )}

                    {resetLoading ? (
                        <p className="text-gray-500 text-sm">Loading...</p>
                    ) : resetRequests.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border">
                            <p className="text-sm">No password reset requests found.</p>
                        </div>
                    ) : (
                        <div className="border rounded-xl overflow-hidden bg-white">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Club / Email</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Reason</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Date</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Status</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {resetRequests.map(req => (
                                        <tr key={req._id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-gray-800">{req.organizer?.organizerName || 'Unknown'}</p>
                                                <p className="text-xs text-gray-400">{req.organizer?.email}</p>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 max-w-xs">
                                                <p className="text-sm line-clamp-2">{req.reason}</p>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                                                {new Date(req.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                    req.status === 'Approved' ? 'bg-green-100 text-green-700'
                                                    : req.status === 'Rejected' ? 'bg-red-100 text-red-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {req.status}
                                                </span>
                                                {req.adminNote && (
                                                    <p className="text-xs text-gray-400 mt-1">{req.adminNote}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {req.status === 'Pending' ? (
                                                    <div className="flex flex-col gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Optional note"
                                                            value={resetNotes[req._id] || ''}
                                                            onChange={e => setResetNotes(prev => ({ ...prev, [req._id]: e.target.value }))}
                                                            className="border rounded px-2 py-1 text-xs w-36 focus:ring-1 focus:ring-blue-400 outline-none"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleResetApprove(req._id)}
                                                                className="text-xs px-3 py-1 rounded bg-green-600 text-white font-semibold hover:bg-green-700 transition"
                                                            >
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleResetReject(req._id)}
                                                                className="text-xs px-3 py-1 rounded bg-red-500 text-white font-semibold hover:bg-red-600 transition"
                                                            >
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
