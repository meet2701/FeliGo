import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user'));
    const [unreadCount, setUnreadCount] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);

    const fetchUnread = useCallback(async () => {
        if (!user?.token) return;
        try {
            const res = await axios.get(import.meta.env.VITE_API_URL + '/api/notifications', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            setUnreadCount(res.data.filter(n => !n.isRead).length);
        } catch { }
    }, [user?.token]);

    useEffect(() => {
        if (!user?.token || user.role === 'admin') return;

        fetchUnread();
        const interval = setInterval(fetchUnread, 60000);
        window.addEventListener('notifications-updated', fetchUnread);

        const socket = io(import.meta.env.VITE_API_URL, {
            auth: { token: user.token },
            transports: ['websocket'],
            reconnection: true,
        });
        socket.on('live_notification', ({ eventName, senderName, isReply }) => {
            const msg = isReply
                ? `💬 ${senderName} replied in "${eventName}"`
                : `📢 New announcement in "${eventName}"`;
            toast.info(msg, {
                autoClose: 6000,
                onClick: () => navigate('/notifications'),
                style: { cursor: 'pointer' },
            });
            setUnreadCount(c => c + 1);
            window.dispatchEvent(new Event('notifications-updated'));
        });

        return () => {
            clearInterval(interval);
            window.removeEventListener('notifications-updated', fetchUnread);
            socket.disconnect();
        };
    }, [user?.token]);

    const authRoutes = ['/', '/login', '/register'];
    if (!user || authRoutes.includes(location.pathname)) return null;

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

    const mobileLinkClass = (path) =>
        `block px-4 py-3 text-sm font-medium border-b border-blue-500 transition ${
            isActive(path) ? 'bg-blue-800 text-white' : 'text-blue-100 hover:bg-blue-500'
        }`;

    const links = role === 'participant' ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/events', label: 'Browse Events' },
        { to: '/clubs', label: 'Clubs' },
        { to: '/notifications', label: 'Notifications', badge: unreadCount },
        { to: '/profile', label: 'Profile' },
    ] : role === 'organizer' ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/create-event', label: 'Create Event' },
        { to: '/ongoing-events', label: 'Ongoing Events' },
        { to: '/notifications', label: 'Notifications', badge: unreadCount },
        { to: '/profile', label: 'Profile' },
    ] : [
        { to: '/admin', label: 'Dashboard' },
        { to: '/admin?tab=manage', label: 'Manage Clubs' },
        { to: '/admin?tab=password', label: 'Password Requests' },
    ];

    return (
        <nav className="bg-blue-600 shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 flex items-center justify-between h-14">
                <Link to="/dashboard" className="text-white font-bold text-lg tracking-wide">FeliGo</Link>

                {/* Desktop links */}
                <div className="hidden md:flex items-center gap-1">
                    {links.map(({ to, label, badge }) => (
                        <Link key={to} to={to} className={`${linkClass(to)} relative`}>
                            {label}
                            {badge > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                    {badge > 9 ? '9+' : badge}
                                </span>
                            )}
                        </Link>
                    ))}
                    <button onClick={logout} className="ml-2 px-3 py-2 rounded-md text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition">Logout</button>
                </div>

                {/* Mobile: notif badge + hamburger */}
                <div className="flex md:hidden items-center gap-3">
                    {unreadCount > 0 && (
                        <Link to="/notifications" className="relative text-white">
                            🔔
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        </Link>
                    )}
                    <button onClick={() => setMenuOpen(o => !o)} className="text-white text-2xl leading-none">
                        {menuOpen ? '✕' : '☰'}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown */}
            {menuOpen && (
                <div className="md:hidden bg-blue-600 border-t border-blue-500">
                    {links.map(({ to, label }) => (
                        <Link key={to} to={to} className={mobileLinkClass(to)} onClick={() => setMenuOpen(false)}>
                            {label}
                        </Link>
                    ))}
                    <button onClick={logout} className="w-full text-left px-4 py-3 text-sm font-medium text-red-200 hover:bg-blue-500 transition">
                        Logout
                    </button>
                </div>
            )}
        </nav>
    );
};

export default Navbar;