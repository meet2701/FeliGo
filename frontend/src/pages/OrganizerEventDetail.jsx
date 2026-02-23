import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { io } from 'socket.io-client';

const REACTIONS = ['👍', '❤️', '😂', '🔥', '👏'];

// ---- Forum Message (organizer view) ----
const ForumMessage = ({ msg, currentUserId, socket, eventId }) => {
    const [showReplies, setShowReplies] = useState(false);
    const [replyText, setReplyText] = useState('');

    const sendReply = () => {
        if (!replyText.trim()) return;
        socket.emit('send_message', { eventId, text: replyText.trim(), parentMessageId: msg._id });
        setReplyText('');
        setShowReplies(true);
    };
    const react = (emoji) => socket.emit('react', { messageId: msg._id, emoji });
    const deleteMsg = () => socket.emit('delete_message', { messageId: msg._id, eventId });
    const pinMsg = () => socket.emit('pin_message', { messageId: msg._id, eventId });

    return (
        <div className={`rounded-lg p-3 mb-2 border ${msg.isPinned ? 'border-yellow-300 bg-yellow-50' : msg.isAnnouncement ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        {msg.isPinned && <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded font-bold">Pinned</span>}
                        {msg.isAnnouncement && <span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded font-bold">Announcement</span>}
                        <span className="font-semibold text-sm">{msg.sender?._id?.toString() === currentUserId || msg.sender?.toString() === currentUserId ? 'You' : (msg.senderName || 'User')}</span>
                        {msg.senderRole === 'organizer' && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Organizer</span>}
                        <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-gray-800 break-words">{msg.text}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                    <button onClick={pinMsg} className="text-xs text-yellow-600 hover:text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-300 hover:bg-yellow-50">{msg.isPinned ? 'Unpin' : 'Pin'}</button>
                    <button onClick={deleteMsg} className="text-xs text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded border border-red-200 hover:bg-red-50">Del</button>
                </div>
            </div>
            <div className="flex gap-1 mt-2 flex-wrap">
                {REACTIONS.map(emoji => {
                    const count = (msg.reactions?.[emoji] || []).length;
                    const reacted = (msg.reactions?.[emoji] || []).includes(currentUserId);
                    return (
                        <button key={emoji} onClick={() => react(emoji)}
                            className={`text-xs px-1.5 py-0.5 rounded border transition ${reacted ? 'bg-blue-100 border-blue-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                            {emoji}{count > 0 ? ` ${count}` : ''}
                        </button>
                    );
                })}
            </div>
            <div className="mt-2">
                {msg.replies?.length > 0 && (
                    <button onClick={() => setShowReplies(v => !v)} className="text-xs text-blue-600 hover:underline mb-1">
                        {showReplies ? 'Hide replies' : `View ${msg.replies.length} repl${msg.replies.length === 1 ? 'y' : 'ies'}`}
                    </button>
                )}
                {showReplies && msg.replies?.map(r => (
                    <div key={r._id} className="ml-4 pl-3 border-l-2 border-gray-200 mt-1">
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-xs">{r.sender?._id?.toString() === currentUserId || r.sender?.toString() === currentUserId ? 'You' : (r.senderName || 'User')}</span>
                            {r.senderRole === 'organizer' && <span className="text-xs bg-green-100 text-green-700 px-1 rounded">Organizer</span>}
                            <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs text-gray-700">{r.text}</p>
                    </div>
                ))}
                <div className="flex gap-2 mt-2">
                    <input value={replyText} onChange={e => setReplyText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendReply()}
                        placeholder="Reply..." className="flex-1 text-xs border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    <button onClick={sendReply} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border">Reply</button>
                </div>
            </div>
        </div>
    );
};

const STATUS_STYLES = {
    Draft:     'bg-yellow-100 text-yellow-800',
    Published: 'bg-green-100 text-green-800',
    Ongoing:   'bg-blue-100 text-blue-800',
    Completed: 'bg-gray-100 text-gray-800',
    Cancelled: 'bg-red-100 text-red-800',
};

const PAYMENT_BADGE = {
    Pending:  'bg-yellow-100 text-yellow-800',
    Approved: 'bg-green-100 text-green-800',
    Rejected: 'bg-red-100 text-red-800',
};

// OrderRow sub-component
const OrderRow = ({ order, index, onAction }) => {
    const [note, setNote] = useState('');
    const [showProof, setShowProof] = useState(false);

    return (
        <tr className="hover:bg-gray-50 transition">
            <td className="px-4 py-3 text-gray-500">{index + 1}</td>
            <td className="px-4 py-3 font-semibold text-gray-800">{order.name}</td>
            <td className="px-4 py-3 text-gray-600">{order.email}</td>
            <td className="px-4 py-3 text-xs text-gray-600">
                {order.responses && Object.keys(order.responses).length > 0
                    ? Object.entries(order.responses).map(([k, v]) => (
                        <div key={k}><span className="font-semibold text-gray-700">{k}:</span> {v}</div>
                    ))
                    : <span className="text-gray-300">—</span>
                }
            </td>
            <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{new Date(order.registeredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
            <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${PAYMENT_BADGE[order.paymentStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {order.paymentStatus}
                </span>
                {order.paymentNote && (
                    <p className="text-xs text-gray-400 mt-1">{order.paymentNote}</p>
                )}
            </td>
            <td className="px-4 py-3">
                {order.paymentProofUrl ? (
                    <button onClick={() => setShowProof(true)} className="text-blue-600 hover:underline text-xs font-semibold">
                        View Proof
                    </button>
                ) : <span className="text-gray-300 text-xs">—</span>}
                {showProof && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowProof(false)}>
                        <div className="bg-white rounded-xl p-4 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-gray-800">Payment Proof</h4>
                                <button onClick={() => setShowProof(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                            </div>
                            <img src={order.paymentProofUrl} alt="Payment proof" className="w-full rounded-lg max-h-96 object-contain" />
                        </div>
                    </div>
                )}
            </td>
            <td className="px-4 py-3">
                {order.paymentStatus === 'Pending' ? (
                    <div className="flex flex-col gap-2">
                        <input
                            type="text"
                            placeholder="Optional note"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="border rounded px-2 py-1 text-xs w-32 focus:ring-1 focus:ring-blue-400 outline-none"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => onAction(order.orderId, 'approve', note)}
                                className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded hover:bg-green-700 transition"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => onAction(order.orderId, 'reject', note)}
                                className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded hover:bg-red-600 transition"
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
    );
};

const OrganizerEventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [event, setEvent] = useState(null);
    const [orders, setOrders] = useState([]);
    const [stockRemaining, setStockRemaining] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [attendanceFilter, setAttendanceFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');

    const [scannerActive, setScannerActive] = useState(false);
    const [lastScan, setLastScan] = useState(null);
    const scannerRef = useRef(null);
    const scannerDivId = 'qr-reader';

    const [forumMessages, setForumMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [socketConnected, setSocketConnected] = useState(false);
    const forumSocketRef = useRef(null);
    const messagesEndRef = useRef(null);

    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (!user || user.role !== 'organizer') {
            navigate('/login');
            return;
        }
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const [eventRes, participantsRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/events/${id}`),
                axios.get(`${import.meta.env.VITE_API_URL}/api/events/${id}/participants`, config)
            ]);
            setEvent(eventRes.data);
            setData(participantsRes.data);
            // Load orders for merchandise events
            if (eventRes.data.type === 'merchandise') {
                const ordersRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/${id}/orders`, config);
                setOrders(ordersRes.data.orders || []);
                setStockRemaining(ordersRes.data.stock ?? null);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load event details');
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    // Export participants as CSV
    const exportCSV = (type = 'participants') => {
        if (type === 'attendance') {
            if (!data?.participants?.length) return toast.error('No participants to export');
            const headers = ['Sr.No', 'Name', 'Email', 'Attended', 'Attendance Time'];
            const rows = data.participants.map((p, i) => [
                i + 1, p.name, p.email,
                p.attendanceMarked ? 'Yes' : 'No',
                p.attendanceAt ? new Date(p.attendanceAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''
            ]);
            const csvContent = [headers, ...rows]
                .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
                .join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${data.eventName}_attendance.csv`;
            link.click();
            URL.revokeObjectURL(url);
            return;
        }

        if (!data?.participants?.length) return toast.error('No participants to export');
        const formLabels = data.formFields.map(f => f.label);
        const headers = ['Sr.No', 'Name', 'Email', 'Type', 'College', 'Contact', 'Registered At', ...formLabels];
        const rows = data.participants.map(p => [
            p.srNo, p.name, p.email, p.participantType, p.college, p.contactNumber,
            new Date(p.registeredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            ...formLabels.map(label => p.responses[label] || '')
        ]);
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${data.eventName}_participants.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Attendance helpers 
    const toggleAttendance = async (participantId, currentlyMarked) => {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        try {
            if (currentlyMarked) {
                await axios.delete(`${import.meta.env.VITE_API_URL}/api/events/${id}/participants/${participantId}/attendance`, config);
            } else {
                await axios.put(`${import.meta.env.VITE_API_URL}/api/events/${id}/participants/${participantId}/attendance`, {}, config);
            }
            setData(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                    p.participantId.toString() === participantId.toString()
                        ? { ...p, attendanceMarked: !currentlyMarked, attendanceAt: !currentlyMarked ? new Date() : null }
                        : p
                )
            }));
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update attendance');
        }
    };

    // Forum socket 
    useEffect(() => {
        if (activeTab !== 'forum' || !id) {
            if (forumSocketRef.current) {
                forumSocketRef.current.disconnect();
                forumSocketRef.current = null;
            }
            return;
        }
        axios.get(`${import.meta.env.VITE_API_URL}/api/forum/${id}`)
            .then(r => setForumMessages(r.data)).catch(() => {});

        const socket = io(import.meta.env.VITE_API_URL, { auth: { token: user.token } });
        forumSocketRef.current = socket;
        socket.on('connect', () => { setSocketConnected(true); socket.emit('join_forum', { eventId: id }); });
        socket.on('disconnect', () => setSocketConnected(false));
        socket.on('new_message', (msg) => {
            setForumMessages(prev => {
                if (msg.parentMessage) {
                    return prev.map(m => m._id === msg.parentMessage
                        ? { ...m, replies: [...(m.replies || []), msg] } : m);
                }
                return [...prev, { ...msg, replies: [] }];
            });
        });
        socket.on('reaction_update', ({ messageId, reactions }) => {
            setForumMessages(prev => prev.map(m =>
                m._id === messageId ? { ...m, reactions } :
                { ...m, replies: (m.replies || []).map(r => r._id === messageId ? { ...r, reactions } : r) }
            ));
        });
        socket.on('message_deleted', ({ messageId }) => {
            setForumMessages(prev => prev.filter(m => m._id !== messageId));
        });
        socket.on('message_pinned', ({ messageId, isPinned }) => {
            setForumMessages(prev => prev.map(m => m._id === messageId ? { ...m, isPinned } : m));
        });
        return () => { socket.disconnect(); forumSocketRef.current = null; };
    }, [activeTab, id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [forumMessages]);

    const sendMessage = () => {
        if (!newMessage.trim() || !forumSocketRef.current) return;
        forumSocketRef.current.emit('send_message', { eventId: id, text: newMessage.trim() });
        setNewMessage('');
    };

    // QR Scanner 
    useEffect(() => {
        if (activeTab !== 'attendance') {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(() => {});
                scannerRef.current = null;
            }
            setScannerActive(false);
            return;
        }
    }, [activeTab]);

    const startScanner = () => {
        if (scannerRef.current) return;
        setScannerActive(true);
        setTimeout(() => {
            const scanner = new Html5QrcodeScanner(scannerDivId, { fps: 10, qrbox: 250 }, false);
            scanner.render(
                async (decodedText) => {
                    try {
                        const payload = JSON.parse(decodedText);
                        const ticketId = payload.ticketId;
                        if (!ticketId) { toast.error('Invalid QR code'); return; }

                        const participant = data?.participants?.find(
                            p => p.participantId?.toString() === ticketId.toString()
                        );
                        if (!participant) { toast.error('Participant not found for this event'); return; }
                        if (participant.attendanceMarked) {
                            setLastScan({ name: participant.name, status: 'already' });
                            toast.info(`${participant.name} already checked in`);
                            return;
                        }
                        await toggleAttendance(participant.participantId, false);
                        setLastScan({ name: participant.name, status: 'success' });
                        toast.success(`Checked in: ${participant.name}`);
                    } catch {
                        toast.error('Could not parse QR code');
                    }
                },
                (err) => { }
            );
            scannerRef.current = scanner;
        }, 300);
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.clear().catch(() => {});
            scannerRef.current = null;
        }
        setScannerActive(false);
        setLastScan(null);
    };

    // Payment order actions 
    const handleOrderAction = async (orderId, action, note = '') => {
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        try {
            await axios.put(`${import.meta.env.VITE_API_URL}/api/events/${id}/orders/${orderId}/${action}`, { note }, config);
            toast.success(action === 'approve' ? 'Order approved. Ticket sent.' : 'Order rejected.');
            const ordersRes = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/${id}/orders`, config);
            setOrders(ordersRes.data.orders || []);
            setStockRemaining(ordersRes.data.stock ?? null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        }
    };

    const filteredParticipants = (data?.participants || []).filter(p => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!p.name.toLowerCase().includes(q) && !p.email.toLowerCase().includes(q)) return false;
        }
        if (attendanceFilter === 'attended' && !p.attendanceMarked) return false;
        if (attendanceFilter === 'not-attended' && p.attendanceMarked) return false;
        if (typeFilter === 'IIIT' && p.participantType !== 'IIIT') return false;
        if (typeFilter === 'Non-IIIT' && p.participantType !== 'Non-IIIT') return false;
        return true;
    });

    if (loading) return <div className="text-center mt-20 text-lg">Loading...</div>;
    if (!event || !data) return null;

    const isDatePassed = new Date(event.registrationDeadline) < new Date();

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">

            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <button onClick={() => navigate('/dashboard')} className="text-blue-600 hover:underline text-sm mb-2 block">
                        ← Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800">{event.name}</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[event.status] || 'bg-gray-100'}`}>
                            {event.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${event.type === 'normal' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {event.type}
                        </span>
                        <span className="text-sm text-gray-500">
                            {isDatePassed ? 'Registration Closed' : 'Registration Open'}
                        </span>
                    </div>
                </div>
                <button
                    onClick={() => navigate(`/edit-event/${id}`)}
                    className="bg-yellow-500 text-white font-bold px-5 py-2 rounded-lg hover:bg-yellow-600 transition"
                >
                    ✏️ Edit Event
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b flex-wrap gap-0">
                {[
                    { key: 'overview', label: 'Overview' },
                    { key: 'participants', label: `Participants (${data.totalRegistrations})` },
                    ...(event.type === 'merchandise' ? [{ key: 'orders', label: `Orders (${orders.length})` }] : []),
                    { key: 'attendance', label: 'Attendance' },
                    { key: 'forum', label: 'Forum' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-6 py-3 font-semibold text-sm transition border-b-2 ${
                            activeTab === tab.key
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* TAB:OVERVIEW*/}
            {activeTab === 'overview' && (
                <div className="space-y-6">

                    {/* Analytics Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
                            <p className="text-3xl font-bold text-blue-600">{data.totalRegistrations}</p>
                            <p className="text-sm text-gray-500 mt-1">Total Registrations</p>
                        </div>
                        {event.type === 'merchandise' ? (
                            <>
                                <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
                                    <p className="text-3xl font-bold text-green-600">{data.approvedCount ?? 0}</p>
                                    <p className="text-sm text-gray-500 mt-1">Approved Orders</p>
                                </div>
                                <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
                                    <p className="text-3xl font-bold text-yellow-500">{data.pendingCount ?? 0}</p>
                                    <p className="text-sm text-gray-500 mt-1">Pending Approval</p>
                                </div>
                            </>
                        ) : null}
                        <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
                            <p className="text-3xl font-bold text-green-600">₹{data.revenue}</p>
                            <p className="text-sm text-gray-500 mt-1">Total Revenue</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
                            <p className="text-3xl font-bold text-purple-600">
                                {event.registrationLimit > 0
                                    ? `${Math.round(((event.type === 'merchandise' ? (data.approvedCount ?? 0) : data.totalRegistrations) / event.registrationLimit) * 100)}%`
                                    : '∞'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Capacity Filled</p>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
                            <p className="text-3xl font-bold text-orange-500">
                                {event.registrationLimit > 0
                                    ? Math.max(0, event.registrationLimit - (event.type === 'merchandise' ? (data.approvedCount ?? 0) : data.totalRegistrations))
                                    : '∞'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Spots Remaining</p>
                        </div>
                    </div>

                    {/* Event Info */}
                    <div className="bg-white rounded-xl shadow-sm border p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-bold text-gray-700 mb-3">📅 Schedule</h3>
                            <p className="text-sm text-gray-600 mb-1"><span className="font-semibold">Start:</span> {new Date(event.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                            <p className="text-sm text-gray-600 mb-1"><span className="font-semibold">End:</span> {new Date(event.endDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                            <p className="text-sm text-gray-600"><span className="font-semibold">Deadline:</span> {new Date(event.registrationDeadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-700 mb-3">ℹ️ Details</h3>
                            <p className="text-sm text-gray-600 mb-1"><span className="font-semibold">Location:</span> {event.location || 'TBA'}</p>
                            <p className="text-sm text-gray-600 mb-1"><span className="font-semibold">Eligibility:</span> {event.eligibility}</p>
                            <p className="text-sm text-gray-600"><span className="font-semibold">Price:</span> {event.price === 0 ? 'Free' : `₹${event.price}`}</p>
                        </div>
                        <div className="md:col-span-2">
                            <h3 className="font-bold text-gray-700 mb-2">📝 Description</h3>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{event.description}</p>
                        </div>
                        {event.tags?.length > 0 && (
                            <div className="md:col-span-2 flex flex-wrap gap-2">
                                {event.tags.map((tag, i) => (
                                    <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Custom Form Fields Summary */}
                    {data.formFields?.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <h3 className="font-bold text-gray-700 mb-3">📋 Registration Form Questions</h3>
                            <div className="space-y-2">
                                {data.formFields.map((field, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                                        <span className="font-medium text-gray-700">{field.label}</span>
                                        <span className="text-gray-400 text-xs">({field.fieldType})</span>
                                        {field.required && <span className="text-red-500 text-xs font-bold">Required</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/*TAB: PARTICIPANTS */}
            {activeTab === 'participants' && (
                <div className="space-y-4">
                    <div className="flex gap-3 justify-between items-center flex-wrap">
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="flex-1 min-w-[200px] p-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none text-sm"
                        />
                        <select value={attendanceFilter} onChange={e => setAttendanceFilter(e.target.value)} className="p-2 border rounded-lg text-sm">
                            <option value="all">All Attendance</option>
                            <option value="attended">Attended</option>
                            <option value="not-attended">Not Attended</option>
                        </select>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="p-2 border rounded-lg text-sm">
                            <option value="all">All Types</option>
                            <option value="IIIT">IIIT</option>
                            <option value="Non-IIIT">Non-IIIT</option>
                        </select>
                        <button
                            onClick={() => exportCSV('participants')}
                            className="bg-green-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm whitespace-nowrap"
                        >
                            Export CSV
                        </button>
                    </div>

                    {filteredParticipants.length === 0 ? (
                        <div className="text-center py-16 text-gray-500 bg-white rounded-xl border">
                            <p className="text-lg">No participants yet.</p>
                            <p className="text-sm mt-1">Share your event to get registrations!</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">College</th>
                                        {event.type === 'merchandise' && (
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Payment</th>
                                        )}
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Registered At</th>
                                        {data.formFields.map(f => (
                                            <th key={f.label} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">
                                                {f.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredParticipants.map(p => (
                                        <tr key={p.email} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 text-gray-500">{p.srNo}</td>
                                            <td className="px-4 py-3 font-semibold text-gray-800">{p.name}</td>
                                            <td className="px-4 py-3 text-gray-600">{p.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${p.participantType === 'IIIT' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {p.participantType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{p.college}</td>
                                            {event.type === 'merchandise' && (
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                                        p.paymentStatus === 'Approved' ? 'bg-green-100 text-green-700' :
                                                        p.paymentStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>{p.paymentStatus}</span>
                                                </td>
                                            )}
                                            <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(p.registeredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                                            {data.formFields.map(f => (
                                                <td key={f.label} className="px-4 py-3 text-gray-600">
                                                    {p.responses[f.label] || <span className="text-gray-300">—</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="px-4 py-3 border-t text-xs text-gray-500">
                                Showing {filteredParticipants.length} of {data.totalRegistrations} participants
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB: ORDERS (merchandise only) */}
            {activeTab === 'orders' && event.type === 'merchandise' && (
                <div className="space-y-4">
                    {/* Stock status banner */}
                    <div className={`px-4 py-3 rounded-lg text-sm font-semibold border ${
                        stockRemaining === 0
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}>
                        {stockRemaining === 0
                            ? 'Stock exhausted — no more orders can be approved. Edit the event to increase stock.'
                            : `Stock remaining: ${stockRemaining ?? '—'} unit(s). Approving an order will decrement this.`}
                    </div>

                    {orders.length === 0 ? (
                        <div className="text-center py-16 text-gray-500 bg-white rounded-xl border">
                            <p className="text-lg">No orders yet.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Variants / Responses</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Ordered At</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Proof</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {orders.map((order, i) => (
                                        <OrderRow
                                            key={order.orderId}
                                            order={order}
                                            index={i}
                                            onAction={handleOrderAction}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/*TAB: ATTENDANCE */}
            {activeTab === 'attendance' && (
                <div className="space-y-5">
                    {/* Summary bar */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border shadow-sm p-5 text-center">
                            <p className="text-3xl font-bold text-green-600">
                                {data.participants.filter(p => p.attendanceMarked).length}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Checked In</p>
                        </div>
                        <div className="bg-white rounded-xl border shadow-sm p-5 text-center">
                            <p className="text-3xl font-bold text-gray-700">{data.totalRegistrations}</p>
                            <p className="text-sm text-gray-500 mt-1">Total Registered</p>
                        </div>
                        <div className="bg-white rounded-xl border shadow-sm p-5 text-center">
                            <p className="text-3xl font-bold text-blue-600">
                                {data.totalRegistrations > 0
                                    ? `${Math.round((data.participants.filter(p => p.attendanceMarked).length / data.totalRegistrations) * 100)}%`
                                    : '0%'}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">Attendance Rate</p>
                        </div>
                    </div>

                    {/* QR Scanner */}
                    <div className="bg-white rounded-xl border shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800 text-lg">QR Code Scanner</h3>
                            <div className="flex gap-3">
                                {!scannerActive ? (
                                    <button
                                        onClick={startScanner}
                                        className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                                    >
                                        Start Scanner
                                    </button>
                                ) : (
                                    <button
                                        onClick={stopScanner}
                                        className="bg-red-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-600 transition text-sm"
                                    >
                                        Stop Scanner
                                    </button>
                                )}
                            </div>
                        </div>

                        {scannerActive && (
                            <div className="flex flex-col items-center gap-4">
                                <div id={scannerDivId} className="w-full max-w-sm" />
                                {lastScan && (
                                    <div className={`px-4 py-3 rounded-lg text-sm font-semibold w-full max-w-sm text-center ${
                                        lastScan.status === 'success'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {lastScan.status === 'success'
                                            ? `Checked in: ${lastScan.name}`
                                            : `Already checked in: ${lastScan.name}`}
                                    </div>
                                )}
                            </div>
                        )}

                        {!scannerActive && (
                            <p className="text-sm text-gray-500">
                                Click "Start Scanner" to activate your camera and scan participant QR codes for check-in.
                            </p>
                        )}
                    </div>

                    {/* Manual attendance list */}
                    <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
                        <div className="flex items-center justify-between px-5 py-4 border-b">
                            <h3 className="font-bold text-gray-800">Manual Attendance Override</h3>
                            <button
                                onClick={() => exportCSV('attendance')}
                                className="bg-green-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                            >
                                Export Attendance CSV
                            </button>
                        </div>
                        {data.participants.length === 0 ? (
                            <p className="text-center py-10 text-gray-500 text-sm">No participants registered.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Email</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Check-in Time</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Present</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.participants.map((p, i) => (
                                        <tr key={p.participantId} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                                            <td className="px-4 py-3 text-gray-600">{p.email}</td>
                                            <td className="px-4 py-3 text-gray-500 text-xs">
                                                {p.attendanceAt ? new Date(p.attendanceAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : <span className="text-gray-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="checkbox"
                                                    checked={p.attendanceMarked}
                                                    onChange={() => toggleAttendance(p.participantId, p.attendanceMarked)}
                                                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'forum' && (
                <div className="bg-white rounded-xl border p-6 mt-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Discussion Forum</h2>
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${socketConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {socketConnected ? 'Live' : 'Connecting...'}
                        </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto mb-4 pr-1">
                        {forumMessages.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-8">No messages yet.</p>
                        ) : (
                            forumMessages.map(msg => (
                                <ForumMessage key={msg._id} msg={msg}
                                    currentUserId={user._id}
                                    socket={forumSocketRef.current}
                                    eventId={id} />
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="flex gap-2 border-t pt-3">
                        <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            placeholder="Post an announcement or reply..."
                            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        <button onClick={sendMessage}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 transition">
                            Send
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganizerEventDetail;
