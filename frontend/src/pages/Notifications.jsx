import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Notifications = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const res = await axios.get(import.meta.env.VITE_API_URL + '/api/notifications', config);
            setNotifications(res.data);
        } catch {
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    };

    const markAllRead = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.put(import.meta.env.VITE_API_URL + '/api/notifications/read', {}, config);
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            window.dispatchEvent(new Event('notifications-updated'));
        } catch {
            toast.error('Failed to mark as read');
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="container mx-auto p-6 max-w-3xl">
            <button onClick={() => navigate(-1)} className="mb-4 text-blue-600 hover:underline text-sm font-semibold">Back</button>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Notifications</h1>
                {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-sm text-blue-600 hover:underline font-semibold">
                        Mark all as read
                    </button>
                )}
            </div>

            {loading ? (
                <p className="text-gray-500 text-sm">Loading...</p>
            ) : notifications.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white rounded-xl border">
                    <p className="text-sm">No notifications yet.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map(n => (
                        <div
                            key={n._id}
                            onClick={() => navigate(`/events/${n.event}`)}
                            className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition ${
                                n.isRead ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800">
                                        {n.senderName} <span className="font-normal text-gray-500">in</span> {n.eventName}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1 truncate">{n.text}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-3 shrink-0">
                                    {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                                    <span className="text-xs text-gray-400">{new Date(n.createdAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Notifications;
