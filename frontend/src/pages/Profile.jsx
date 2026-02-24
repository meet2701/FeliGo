import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [allOrganizers, setAllOrganizers] = useState([]);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        contactNumber: '',
        college: '',
        interests: [],
        organizerName: '',
        description: '',
        website: '',
        category: '',
        contactEmail: '',
        discordWebhook: ''
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [resetReason, setResetReason] = useState('');
    const [resetHistory, setResetHistory] = useState([]);
    const [resetLoading, setResetLoading] = useState(false);

    const interestOptions = [
        "Coding", "Hackathons", "Robotics", "AI/ML", "Music", "Dance", "Drama", "Art", "Adventure",
        "Debate", "Literature", "Gaming", "Sports", "Photography", "Business", "Social Service"
    ];

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (!storedUser) {
            navigate('/login');
        } else {
            fetchUserProfile(storedUser.token);
            if (storedUser.role === 'participant') {
                fetchOrganizers();
            }
            if (storedUser.role === 'organizer') {
                fetchResetHistory(storedUser.token);
            }
        }
    }, [navigate]);

    const fetchUserProfile = async (token) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(import.meta.env.VITE_API_URL + '/api/auth/me', config);
            const data = response.data.user;
            
            const safeUser = {
                ...data,
                followedClubs: data.followedClubs || [] 
            };
            setUser(safeUser);
            setFormData({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                contactNumber: data.contactNumber || '',
                college: data.college || (data.participantType === 'IIIT' ? 'IIIT Hyderabad' : ''),
                interests: data.interests || [],
                organizerName: data.organizerName || '',
                description: data.description || '',
                website: data.website || '',
                category: data.category || 'Technical',
                contactEmail: data.contactEmail || '',
                discordWebhook: data.discordWebhook || ''
            });
        } catch (error) {
            toast.error('Failed to fetch profile');
        }
    };

    const fetchOrganizers = async () => {
        try {
            const res = await axios.get(import.meta.env.VITE_API_URL + '/api/auth/organizers');
            setAllOrganizers(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const onChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const toggleInterest = (interest) => {
        const currentInterests = formData.interests;
        if (currentInterests.includes(interest)) {
            setFormData({ ...formData, interests: currentInterests.filter(i => i !== interest) });
        } else {
            setFormData({ ...formData, interests: [...currentInterests, interest] });
        }
    };

    const toggleFollow = async (clubId) => {
        const currentFollows = user.followedClubs || [];
        const isFollowing = currentFollows.some(c => (c._id || c) === clubId);
        let newFollowed;

        if (isFollowing) {
            newFollowed = user.followedClubs.filter(c => (c._id || c) !== clubId);
        } else {
            const clubObj = allOrganizers.find(o => o._id === clubId);
            newFollowed = [...user.followedClubs, clubObj];
        }

        setUser({ ...user, followedClubs: newFollowed });
    };

    const onPasswordChange = (e) => {
        setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const updatedData = { ...formData };

            if (user.role === 'participant') {
                updatedData.followedClubs = user.followedClubs.map(c => c._id || c);
            }

            const response = await axios.put(import.meta.env.VITE_API_URL + '/api/auth/profile', updatedData, config);
            
            const lsUser = JSON.parse(localStorage.getItem('user'));
            const newUserData = { ...lsUser, ...response.data, followedClubs: user.followedClubs }; 
            localStorage.setItem('user', JSON.stringify(newUserData));

            toast.success('Profile Updated Successfully!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update failed');
        }
    };

    const onSubmitPassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.put(import.meta.env.VITE_API_URL + '/api/auth/profile', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            }, config);

            toast.success('Password Changed Successfully!');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Password update failed');
        }
    };

    const fetchResetHistory = async (token) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(import.meta.env.VITE_API_URL + '/api/auth/password-reset-request/mine', config);
            setResetHistory(res.data);
        } catch {
        }
    };

    const onSubmitResetRequest = async (e) => {
        e.preventDefault();
        if (!resetReason.trim()) return toast.error('Please provide a reason');
        setResetLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(import.meta.env.VITE_API_URL + '/api/auth/password-reset-request', { reason: resetReason }, config);
            toast.success('Request submitted. Admin will review it shortly.');
            setResetReason('');
            fetchResetHistory(token);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit request');
        } finally {
            setResetLoading(false);
        }
    };

    if (!user) return <div className="text-center mt-10">Loading Profile...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: Main Profile */}
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-blue-600 hover:underline text-sm font-semibold">
                        ← Back
                    </button>
                    <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>

                    <form onSubmit={onSubmit}>
                        {/* Read-Only Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-gray-50 p-4 rounded border">
                            <div>
                                <label className="block text-xs text-gray-500 font-bold uppercase">Email</label>
                                <p className="text-gray-900 font-mono text-sm">{user.email}</p>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 font-bold uppercase">Role</label>
                                <p className="text-gray-900 capitalize text-sm">{user.role} {user.participantType && `(${user.participantType})`}</p>
                            </div>
                        </div>

                        {/* Participant Fields */}
                        {user.role === 'participant' && (
                            <>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block font-bold mb-1 text-sm">First Name</label>
                                        <input type="text" name="firstName" value={formData.firstName} onChange={onChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block font-bold mb-1 text-sm">Last Name</label>
                                        <input type="text" name="lastName" value={formData.lastName} onChange={onChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>
                                <div className="mb-6">
                                    <label className="block font-bold mb-1 text-sm">College / Organization</label>
                                    <input type="text" name="college" value={formData.college} onChange={onChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="IIIT Hyderabad" />
                                </div>
                                
                                {/*INTERESTS*/}
                                <div className="mb-6">
                                    <label className="block font-bold mb-3 text-sm">Areas of Interest</label>
                                    <div className="p-4 border rounded-lg bg-gray-50">
                                        <div className="flex flex-wrap gap-2">
                                            {interestOptions.map(interest => (
                                                <button
                                                    key={interest}
                                                    type="button"
                                                    onClick={() => toggleInterest(interest)}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
                                                        formData.interests.includes(interest)
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                                                    }`}
                                                >
                                                    {interest} {formData.interests.includes(interest) && '✓'}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">Click to select or deselect interests.</p>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Organizer Fields */}
                        {user.role === 'organizer' && (
                            <>
                                <div className="mb-4">
                                    <label className="block font-bold mb-1 text-sm">Club Name</label>
                                    <input type="text" name="organizerName" value={formData.organizerName} onChange={onChange} className="w-full p-2 border rounded" />
                                </div>
                                <div className="mb-4">
                                    <label className="block font-bold mb-1 text-sm">Category</label>
                                    <select name="category" value={formData.category} onChange={onChange} className="w-full p-2 border rounded bg-white">
                                        {['Technical', 'Cultural', 'Sports', 'Social Service', 'Academic', 'Other'].map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mb-4">
                                    <label className="block font-bold mb-1 text-sm">Description</label>
                                    <textarea name="description" value={formData.description} onChange={onChange} className="w-full p-2 border rounded h-20"></textarea>
                                </div>
                                <div className="mb-4">
                                    <label className="block font-bold mb-1 text-sm">Website</label>
                                    <input type="text" name="website" value={formData.website} onChange={onChange} className="w-full p-2 border rounded" placeholder="https://..." />
                                </div>
                                <div className="mb-4">
                                    <label className="block font-bold mb-1 text-sm">Contact Email</label>
                                    <input type="email" name="contactEmail" value={formData.contactEmail} onChange={onChange} className="w-full p-2 border rounded" placeholder="club@example.com" />
                                    <p className="text-xs text-gray-400 mt-1">Public contact email (separate from login email)</p>
                                </div>
                                <div className="mb-4">
                                    <label className="block font-bold mb-1 text-sm">Discord Webhook URL</label>
                                    <input type="text" name="discordWebhook" value={formData.discordWebhook} onChange={onChange} className="w-full p-2 border rounded font-mono text-sm" placeholder="https://discord.com/api/webhooks/..." />
                                    <p className="text-xs text-gray-400 mt-1">
                                        When set, a notification will be sent to this Discord channel when you publish a new event.
                                    </p>
                                </div>
                            </>
                        )}

                        <div className="mb-6">
                            <label className="block font-bold mb-1 text-sm">Contact Number</label>
                            <input type="text" name="contactNumber" value={formData.contactNumber} onChange={onChange} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>

                        <button type="submit" onClick={onSubmit} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-md">
                            Save Profile Changes
                        </button>
                    </form>
                </div>
            </div>
            

            {/* RIGHT COLUMN: Following & Security */}
            <div className="space-y-8">
                
                {/* FOLLOWED CLUBS */}
                {user.role === 'participant' && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Following</h2>
                            <button
                                type="button"
                                onClick={() => navigate('/clubs')}
                                className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-100 font-semibold border border-blue-200"
                            >
                                Browse All Clubs
                            </button>
                        </div>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                            {user.followedClubs.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p className="text-sm">You're not following any clubs yet.</p>
                                    <button
                                        onClick={() => navigate('/clubs')}
                                        className="mt-3 text-blue-600 hover:underline text-sm font-semibold"
                                    >
                                        Discover Clubs →
                                    </button>
                                </div>
                            ) : (
                                user.followedClubs.map(club => {
                                    const clubData = typeof club === 'object' ? club : allOrganizers.find(o => o._id === club);
                                    if (!clubData) return null;
                                    
                                    return (
                                        <div key={clubData._id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                                            <div className="flex-1">
                                                <p className="font-bold text-sm">{clubData.organizerName}</p>
                                                <p className="text-xs text-gray-500">{clubData.category}</p>
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => toggleFollow(clubData._id)}
                                                className="text-xs px-3 py-1 rounded font-bold border bg-gray-100 text-gray-600 border-gray-300 hover:bg-red-50 hover:text-red-500 hover:border-red-300"
                                            >
                                                Unfollow
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mt-4 text-center">Click 'Save Profile Changes' to save your list.</p>
                    </div>
                )}

                {/* SECURITY — participants only */}
                {user.role !== 'organizer' && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4">Security</h2>
                    <form onSubmit={onSubmitPassword}>
                        <div className="mb-3">
                            <label className="block font-bold mb-1 text-xs">Current Password</label>
                            <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={(e) => setPasswordData({...passwordData, [e.target.name]: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                        <div className="mb-3">
                            <label className="block font-bold mb-1 text-xs">New Password</label>
                            <input type="password" name="newPassword" value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, [e.target.name]: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                        <div className="mb-4">
                            <label className="block font-bold mb-1 text-xs">Confirm</label>
                            <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, [e.target.name]: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                        <button type="submit" className="w-full bg-red-500 text-white font-bold py-2 rounded hover:bg-red-600 transition">
                            Update Password
                        </button>
                    </form>
                </div>
                )}

                {/* PASSWORD RESET REQUEST*/}
                {user.role === 'organizer' && (
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h2 className="text-xl font-bold mb-1">Request Password Reset</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            If you have lost access to your account, submit a request to the admin with your reason. The admin will generate a new temporary password for you.
                        </p>

                        {/* Pending guard */}
                        {resetHistory.some(r => r.status === 'Pending') ? (
                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                                You already have a pending reset request. Please wait for admin review.
                            </div>
                        ) : (
                            <form onSubmit={onSubmitResetRequest} className="space-y-3">
                                <div>
                                    <label className="block font-bold mb-1 text-xs">Reason</label>
                                    <textarea
                                        value={resetReason}
                                        onChange={e => setResetReason(e.target.value)}
                                        rows={3}
                                        placeholder="Explain why you need a password reset..."
                                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none text-sm resize-none"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={resetLoading}
                                    className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition disabled:opacity-60"
                                >
                                    {resetLoading ? 'Submitting...' : 'Submit Reset Request'}
                                </button>
                            </form>
                        )}

                        {/* Request history */}
                        {resetHistory.length > 0 && (
                            <div className="mt-5">
                                <h3 className="text-sm font-bold text-gray-700 mb-2">Request History</h3>
                                <div className="space-y-2">
                                    {resetHistory.map(req => (
                                        <div key={req._id} className="border rounded-lg p-3 text-sm">
                                            <div className="flex justify-between items-start">
                                                <p className="text-gray-700 flex-1 pr-2">{req.reason}</p>
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                                                    req.status === 'Approved' ? 'bg-green-100 text-green-700'
                                                    : req.status === 'Rejected' ? 'bg-red-100 text-red-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {req.status}
                                                </span>
                                            </div>
                                            {req.adminNote && (
                                                <p className="text-xs text-gray-400 mt-1">Admin note: {req.adminNote}</p>
                                            )}
                                            <p className="text-xs text-gray-400 mt-1">{new Date(req.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;