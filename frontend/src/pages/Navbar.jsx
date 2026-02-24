import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user'));
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user || user.role === 'admin') return;

        const fetchUnread = async () => {
            try {
                const res = await axios.get(import.meta.env.VITE_API_URL + '/api/notifications', {
                    headers: { Authorization: `Bearer ${user.token}` }
                });
                setUnreadCount(res.data.filter(n => !n.isRead).length);
            } catch {
            }
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, 30000);
        window.addEventListener('notifications-updated', fetchUnread);

        // Global socket for live notifications
        const socket = io(import.meta.env.VITE_API_URL, { auth: { token: user.token } });
        socket.on('live_notification', ({ eventName, senderName, isReply }) => {
            const msg = isReply
                ? `${senderName} replied in "${eventName}"`
                : `New announcement in "${eventName}"`;
            toast.info(msg, { autoClose: 5000 });
            setUnreadCount(c => c + 1);
        });

        return () => {
            clearInterval(interval);
            window.removeEventListener('notifications-updated', fetchUnread);
            socket.disconnect();
        };
    }, [location.pathname]);

    if (!user) return null;

    const role = user.role;

    const logout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    const linkClass = (path) =>
        `px-3 py-2 rounded-md text-sm font-medium transition ${
            isActive(path)
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-blue-100 hover:bg-blue-500 hover:text-white'
        }`;

    return (
        <nav className="bg-blue-600 shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 flex items-center justify-between h-14">
                {/* Logo */}
                <Link to="/dashboard" className="text-white font-bold text-lg tracking-wide">
                    FeliGo
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center gap-1">

                    {/* ---- Participant Navbar ---- */}
                    {role === 'participant' && (
                        <>
                            <Link to="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
                            <Link to="/events" className={linkClass('/events')}>Browse Events</Link>
                            <Link to="/clubs" className={linkClass('/clubs')}>Clubs</Link>
                            <Link to="/notifications" className={`${linkClass('/notifications')} relative`}>
                                Notifications
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </Link>
                            <Link to="/profile" className={linkClass('/profile')}>Profile</Link>
                        </>
                    )}

                    {/* ---- Organizer Navbar ---- */}
                    {role === 'organizer' && (
                        <>
                            <Link to="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
                            <Link to="/create-event" className={linkClass('/create-event')}>Create Event</Link>
                            <Link to="/ongoing-events" className={linkClass('/ongoing-events')}>Ongoing Events</Link>
                            <Link to="/notifications" className={`${linkClass('/notifications')} relative`}>
                                Notifications
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </Link>
                            <Link to="/profile" className={linkClass('/profile')}>Profile</Link>
                        </>
                    )}

                    {/* ---- Admin Navbar ---- */}
                    {role === 'admin' && (
                        <>
                            <Link to="/admin" className={linkClass('/admin')}>Dashboard</Link>
                            <Link to="/admin?tab=manage" className={linkClass('/admin?tab=manage')}>Manage Clubs</Link>
                            <Link to="/admin?tab=password" className={linkClass('/admin?tab=password')}>Password Requests</Link>
                        </>
                    )}

                    {/* Logout */}
                    <button onClick={logout} className="ml-2 px-3 py-2 rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition">
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;