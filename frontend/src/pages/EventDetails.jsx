import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';

const REACTIONS = ['👍', '❤️', '😂', '🔥', '👏'];

// ---- Calendar helpers ----
const pad = (n) => String(n).padStart(2, '0');
const toICS = (event) => {
    const fmt = (d) => {
        const dt = new Date(new Date(d).getTime() + 5.5 * 60 * 60 * 1000);
        return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`;
    };
    return [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FeliGo//EN',
        'BEGIN:VEVENT',
        `UID:${event._id}@feligo`,
        `DTSTART;TZID=Asia/Kolkata:${fmt(event.startDate)}`,
        `DTEND;TZID=Asia/Kolkata:${fmt(event.endDate || event.startDate)}`,
        `SUMMARY:${event.name}`,
        `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
        `LOCATION:${event.location || ''}`,
        'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
};
const toISTFloating = (d) => {
    const dt = new Date(new Date(d).getTime() + 5.5 * 60 * 60 * 1000);
    return dt.toISOString().replace(/[-:]/g, '').split('.')[0];
};
const googleCalendarUrl = (event) => {
    const p = new URLSearchParams({
        action: 'TEMPLATE', text: event.name,
        dates: `${toISTFloating(event.startDate)}/${toISTFloating(event.endDate || event.startDate)}`,
        details: event.description || '', location: event.location || ''
    });
    return `https://calendar.google.com/calendar/render?${p}`;
};
const outlookUrl = (event) => {
    const fmt = (d) => {
        const dt = new Date(new Date(d).getTime() + 5.5 * 60 * 60 * 1000);
        return dt.toISOString().replace('Z', '');
    };
    const p = new URLSearchParams({
        path: '/calendar/action/compose', rru: 'addevent',
        startdt: fmt(event.startDate),
        enddt: fmt(event.endDate || event.startDate),
        subject: event.name, body: event.description || '', location: event.location || ''
    });
    return `https://outlook.office.com/calendar/0/deeplink/compose?${p}`;
};
const downloadICS = (event) => {
    const blob = new Blob([toICS(event)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${event.name}.ics`; a.click();
    URL.revokeObjectURL(url);
};

// ---- Forum Message component ----
const ForumMessage = ({ msg, currentUserId, isOrganizer, socket, eventId }) => {
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
                {isOrganizer && (
                    <div className="flex gap-1 shrink-0">
                        <button onClick={pinMsg} className="text-xs text-yellow-600 hover:text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-300 hover:bg-yellow-50">{msg.isPinned ? 'Unpin' : 'Pin'}</button>
                        <button onClick={deleteMsg} className="text-xs text-red-500 hover:text-red-700 px-1.5 py-0.5 rounded border border-red-200 hover:bg-red-50">Del</button>
                    </div>
                )}
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

const EventDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [responses, setResponses] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [paymentProof, setPaymentProof] = useState(null);
    const [showMerchForm, setShowMerchForm] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [socketConnected, setSocketConnected] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);

    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/events/${id}`);
                const data = response.data;
                const currentUser = JSON.parse(localStorage.getItem('user'));
                if (currentUser?.role === 'organizer' && data.organizer?._id === currentUser._id) {
                    navigate(`/organizer/event/${id}`, { replace: true });
                    return;
                }
                setEvent(data);
            } catch (error) {
                toast.error("Event not found");
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    useEffect(() => {
        if (!event || !user) return;
        const isOrg = event.organizer?._id?.toString() === user._id?.toString();
        const _myEntries = event.participants?.filter(
            p => p.user === user._id || p.user?._id === user._id || p.user?.toString() === user._id
        ) || [];
        const _SP = { Approved: 0, Pending: 1, Rejected: 2 };
        const myEntry = _myEntries.sort((a, b) => (_SP[a.paymentStatus] ?? 1) - (_SP[b.paymentStatus] ?? 1))[0];
        const isReg = myEntry && myEntry.paymentStatus !== 'Rejected';
        if (!isOrg && !isReg) return;

        axios.get(`${import.meta.env.VITE_API_URL}/api/forum/${id}`).then(r => setMessages(r.data)).catch(() => {});

        axios.put(import.meta.env.VITE_API_URL + '/api/notifications/read', { eventId: id },
            { headers: { Authorization: `Bearer ${user.token}` } })
            .then(() => window.dispatchEvent(new Event('notifications-updated')))
            .catch(() => {});

        const socket = io(import.meta.env.VITE_API_URL, { auth: { token: user.token } });
        socketRef.current = socket;
        socket.on('connect', () => { setSocketConnected(true); socket.emit('join_forum', { eventId: id }); });
        socket.on('disconnect', () => setSocketConnected(false));
        socket.on('new_message', (msg) => {
            setMessages(prev => {
                if (msg.parentMessage) {
                    return prev.map(m => m._id === msg.parentMessage
                        ? { ...m, replies: [...(m.replies || []), msg] } : m);
                }
                return [...prev, { ...msg, replies: [] }];
            });
        });
        socket.on('reaction_update', ({ messageId, reactions }) => {
            setMessages(prev => prev.map(m =>
                m._id === messageId ? { ...m, reactions } :
                { ...m, replies: (m.replies || []).map(r => r._id === messageId ? { ...r, reactions } : r) }
            ));
        });
        socket.on('message_deleted', ({ messageId }) => setMessages(prev => prev.filter(m => m._id !== messageId)));
        socket.on('message_pinned', ({ messageId, isPinned }) => {
            setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isPinned } : m));
        });
        return () => socket.disconnect();
    }, [event, id, user?._id]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleResponseChange = (label, value) => setResponses(prev => ({ ...prev, [label]: value }));

    const handleRegisterClick = () => {
        if (!user) { toast.error("Please login"); navigate('/login'); return; }
        if (event.type === 'merchandise') { setShowMerchForm(true); return; }
        if (event.formFields?.length > 0) { setShowForm(true); } else { submitRegistration({}); }
    };

    const submitRegistration = async (formResponses) => {
        setSubmitting(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post(`${import.meta.env.VITE_API_URL}/api/events/${id}/register`, { responses: formResponses }, config);
            toast.success("Successfully Registered!");
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || "Registration Failed");
        } finally { setSubmitting(false); }
    };

    const handleFormSubmit = (e) => { e.preventDefault(); submitRegistration(responses); };

    const handleProofUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }
        const reader = new FileReader();
        reader.onload = () => setPaymentProof(reader.result);
        reader.readAsDataURL(file);
    };

    const submitMerchOrder = async (e) => {
        e.preventDefault();
        if (!paymentProof) { toast.error('Please upload payment proof'); return; }
        setSubmitting(true);
        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            await axios.post(`${import.meta.env.VITE_API_URL}/api/events/${id}/register`, { paymentProofUrl: paymentProof, responses }, config);
            toast.success("Order placed! Awaiting payment verification.");
            setShowMerchForm(false);
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || "Order Failed");
        } finally { setSubmitting(false); }
    };

    const sendMessage = () => {
        if (!newMessage.trim() || !socketRef.current) return;
        socketRef.current.emit('send_message', { eventId: id, text: newMessage.trim() });
        setNewMessage('');
    };

    if (loading) return <div className="text-center mt-10">Loading Event Details...</div>;
    if (!event) return <div className="text-center mt-10">Event not found.</div>;

    const approvedCount = event.participants.filter(p => p.paymentStatus === 'Approved').length;
    const isFull = event.registrationLimit > 0 && (
        event.type === 'merchandise'
            ? approvedCount >= event.registrationLimit
            : event.participants.length >= event.registrationLimit
    );
    const isDatePassed = new Date(event.registrationDeadline) < new Date();
    const isIneligible = event.eligibility === 'IIIT Only' && user && user.participantType !== 'IIIT';
    const STATUS_PRIORITY = { Approved: 0, Pending: 1, Rejected: 2 };
    const myEntries = user ? (event.participants?.filter(
        p => p.user === user._id || p.user?._id === user._id || p.user?.toString() === user._id
    ) || []) : [];
    const myEntry = myEntries.sort(
        (a, b) => (STATUS_PRIORITY[a.paymentStatus] ?? 1) - (STATUS_PRIORITY[b.paymentStatus] ?? 1)
    )[0];
    const isAlreadyRegistered = !!myEntry && myEntry.paymentStatus === 'Approved';
    const pendingOrder = myEntry?.paymentStatus === 'Pending';
    const isOutOfStock = event.type === 'merchandise' && event.stock <= 0;
    const isOrganizer = user && event.organizer?._id?.toString() === user._id?.toString();
    const canAccessForum = isOrganizer || (myEntry && myEntry.paymentStatus !== 'Rejected');

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-blue-600 hover:underline text-sm font-semibold">
                ← Back
            </button>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 mb-8">
                <div className={`p-8 text-white text-center ${event.type === 'normal' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}>
                    <span className={`inline-block px-3 py-1 mb-3 text-xs font-bold uppercase tracking-wider rounded-full ${event.type === 'normal' ? 'bg-indigo-900 text-blue-100' : 'bg-pink-900 text-pink-100'}`}>
                        {event.type} event
                    </span>
                    <h1 className="text-4xl font-extrabold mb-2">{event.name}</h1>
                    <p className="text-lg opacity-90">Organized by {event.organizer?.organizerName || "Felicity Club"}</p>
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="md:col-span-2 space-y-6">
                            <div>
                                <h3 className="text-xl font-bold mb-2 text-gray-800">About this Event</h3>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-2 text-gray-800">Eligibility</h3>
                                <p className="text-gray-600 bg-gray-50 p-3 rounded border-l-4 border-blue-500">{event.eligibility}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {event.tags?.map((tag, i) => (
                                    <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">#{tag}</span>
                                ))}
                            </div>
                            {event.type === 'merchandise' && event.itemDetails && Object.keys(event.itemDetails).length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold mb-2 text-gray-800">Available Variants</h3>
                                    <div className="bg-purple-50 p-4 rounded border border-purple-200 space-y-2">
                                        {Object.entries(event.itemDetails).map(([k, v]) => (
                                            <div key={k} className="flex">
                                                <span className="font-semibold text-purple-700 w-28">{k}:</span>
                                                <span className="text-gray-700">
                                                    {Array.isArray(v) ? v.join(', ') : v}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {pendingOrder && (
                                <div className="bg-yellow-50 border border-yellow-300 rounded p-3 text-sm text-yellow-800">
                                    Your order is pending payment verification. You will receive a confirmation email once approved.
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📅</span>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Date & Time</p>
                                        <p className="font-semibold text-sm">{new Date(event.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">📍</span>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Location</p>
                                        <p className="font-semibold text-sm">{event.location || 'TBA'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">💰</span>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Price</p>
                                        <p className="font-semibold text-green-600">{event.price === 0 ? 'Free Entry' : `₹${event.price}`}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">⏳</span>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold">Deadline</p>
                                        <p className={`font-semibold text-sm ${isDatePassed ? 'text-red-500' : ''}`}>{new Date(event.registrationDeadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                                    </div>
                                </div>
                                {event.type === 'merchandise' && (
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">📦</span>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold">Stock</p>
                                            <p className={`font-semibold text-sm ${event.stock <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                {event.stock <= 0 ? 'Out of Stock' : `${event.stock} remaining`}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {isAlreadyRegistered ? (
                                    <div className="w-full py-2.5 bg-green-100 text-green-700 font-bold rounded text-center border border-green-300 text-sm">
                                        {event.type === 'merchandise' ? 'Purchase Confirmed' : 'Registered'}
                                    </div>
                                ) : pendingOrder ? (
                                    <div className="w-full py-2.5 bg-yellow-100 text-yellow-700 font-bold rounded text-center border border-yellow-300 text-sm">
                                        Order Pending Approval
                                    </div>
                                ) : isDatePassed ? (
                                    <button disabled className="w-full py-2.5 bg-gray-200 text-gray-500 font-bold rounded text-sm cursor-not-allowed">Registration Closed</button>
                                ) : isOutOfStock ? (
                                    <button disabled className="w-full py-2.5 bg-red-100 text-red-500 font-bold rounded text-sm cursor-not-allowed border border-red-200">Out of Stock</button>
                                ) : isFull ? (
                                    <button disabled className="w-full py-2.5 bg-yellow-100 text-yellow-600 font-bold rounded text-sm cursor-not-allowed">House Full</button>
                                ) : isIneligible ? (
                                    <button disabled className="w-full py-2.5 bg-red-100 text-red-500 font-bold rounded text-sm cursor-not-allowed">IIIT Students Only</button>
                                ) : (
                                    <button onClick={handleRegisterClick}
                                        className="w-full py-2.5 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition text-sm">
                                        {event.type === 'merchandise' ? 'Purchase Now' : 'Register Now'}
                                    </button>
                                )}
                                {event.type === 'merchandise' && (
                                    <p className="text-xs text-gray-400 text-center">One purchase per user.</p>
                                )}
                            </div>

                            {/* Add to Calendar */}
                            <div className="relative">
                                <button onClick={() => setShowCalendar(v => !v)}
                                    className="w-full py-2 border border-gray-300 rounded text-sm font-semibold text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-2">
                                    Add to Calendar
                                </button>
                                {showCalendar && (
                                    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded shadow-lg z-10">
                                        <button onClick={() => { downloadICS(event); setShowCalendar(false); }}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-b">Download .ics</button>
                                        <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer"
                                            className="block px-4 py-2 text-sm hover:bg-gray-50 border-b">Google Calendar</a>
                                        <a href={outlookUrl(event)} target="_blank" rel="noreferrer"
                                            className="block px-4 py-2 text-sm hover:bg-gray-50">Outlook</a>
                                    </div>
                                )}
                            </div>

                            <div className="text-center text-sm text-gray-500">
                                Questions? <span className="text-blue-600">{event.organizer?.email}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ---- Discussion Forum ---- */}
            {canAccessForum && (
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Discussion Forum</h2>
                        <span className={`text-xs px-2 py-0.5 rounded font-semibold ${socketConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {socketConnected ? 'Live' : 'Connecting...'}
                        </span>
                    </div>
                    <div className="max-h-96 overflow-y-auto mb-4 pr-1">
                        {messages.length === 0 ? (
                            <p className="text-gray-400 text-sm text-center py-8">No messages yet. Start the conversation!</p>
                        ) : (
                            messages.map(msg => (
                                <ForumMessage key={msg._id} msg={msg}
                                    currentUserId={user._id}
                                    isOrganizer={isOrganizer}
                                    socket={socketRef.current}
                                    eventId={id} />
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="flex gap-2 border-t pt-3">
                        <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && sendMessage()}
                            placeholder={isOrganizer ? "Post an announcement or reply..." : "Ask a question or post a message..."}
                            className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                        <button onClick={sendMessage}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 transition">
                            Send
                        </button>
                    </div>
                </div>
            )}

            {/* ---- Normal Event Registration Form Modal ---- */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-8">
                        <h2 className="text-xl font-bold mb-4">Registration Form — {event.name}</h2>
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            {event.formFields.map((field, i) => (
                                <div key={i}>
                                    <label className="block text-sm font-bold mb-1">
                                        {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    {(field.fieldType === 'text' || field.fieldType === 'number') && (
                                        <input type={field.fieldType} required={field.required}
                                            value={responses[field.label] || ''}
                                            onChange={e => handleResponseChange(field.label, e.target.value)}
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none" />
                                    )}
                                    {field.fieldType === 'dropdown' && (
                                        <select required={field.required} value={responses[field.label] || ''}
                                            onChange={e => handleResponseChange(field.label, e.target.value)}
                                            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400 outline-none">
                                            <option value="">-- Select --</option>
                                            {field.options.map((opt, j) => <option key={j} value={opt}>{opt}</option>)}
                                        </select>
                                    )}
                                    {field.fieldType === 'checkbox' && (
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={responses[field.label] === 'true'}
                                                onChange={e => handleResponseChange(field.label, e.target.checked ? 'true' : 'false')}
                                                className="w-4 h-4 accent-blue-600" />
                                            <span className="text-sm text-gray-600">Yes</span>
                                        </div>
                                    )}
                                    {field.fieldType === 'file' && (
                                        <input type="file" required={field.required}
                                            onChange={e => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onloadend = () => handleResponseChange(field.label, reader.result);
                                                reader.readAsDataURL(file);
                                            }}
                                            className="w-full p-2 border rounded text-sm text-gray-600" />
                                    )}
                                </div>
                            ))}
                            <div className="flex gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setShowForm(false)}
                                    className="flex-1 py-2 border rounded font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 disabled:opacity-50">
                                    {submitting ? 'Submitting...' : 'Submit & Register'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ---- Merchandise Order Modal ---- */}
            {showMerchForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-8">
                        <h2 className="text-xl font-bold mb-1">Place Order — {event.name}</h2>
                        <p className="text-sm text-gray-500 mb-4">Complete your payment and upload a screenshot as proof. Your order will be confirmed once the organizer approves it.</p>
                        {event.upiId && (
                            <div className="mb-4 flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                                <span className="text-purple-700 text-lg">💳</span>
                                <div>
                                    <p className="text-xs text-purple-500 font-semibold uppercase tracking-wide">Pay to UPI</p>
                                    <p className="font-bold text-purple-900 text-sm select-all">{event.upiId}</p>
                                </div>
                                <button type="button" onClick={() => { navigator.clipboard.writeText(event.upiId); toast.success('UPI ID copied!'); }}
                                    className="ml-auto text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded font-semibold">
                                    Copy
                                </button>
                            </div>
                        )}
                        <form onSubmit={submitMerchOrder} className="space-y-4">
                            {event.itemDetails && Object.keys(event.itemDetails).length > 0 && (
                                <div className="space-y-3 pb-3 border-b">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Select Your Variants</p>
                                    {Object.entries(event.itemDetails).map(([variantName, options]) => (
                                        <div key={variantName}>
                                            <label className="block text-sm font-bold mb-1">
                                                {variantName} <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                required
                                                value={responses[variantName] || ''}
                                                onChange={e => handleResponseChange(variantName, e.target.value)}
                                                className="w-full p-2 border rounded bg-white"
                                            >
                                                <option value="">-- Select {variantName} --</option>
                                                {(Array.isArray(options) ? options : [options]).map((opt, j) => (
                                                    <option key={j} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {event.formFields?.map((field, i) => (
                                <div key={i}>
                                    <label className="block text-sm font-bold mb-1">
                                        {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
                                    </label>
                                    {(field.fieldType === 'text' || field.fieldType === 'number') && (
                                        <input type={field.fieldType} required={field.required}
                                            value={responses[field.label] || ''}
                                            onChange={e => handleResponseChange(field.label, e.target.value)}
                                            className="w-full p-2 border rounded" />
                                    )}
                                    {field.fieldType === 'dropdown' && (
                                        <select required={field.required} value={responses[field.label] || ''}
                                            onChange={e => handleResponseChange(field.label, e.target.value)}
                                            className="w-full p-2 border rounded bg-white">
                                            <option value="">-- Select --</option>
                                            {field.options.map((opt, j) => <option key={j} value={opt}>{opt}</option>)}
                                        </select>
                                    )}
                                    {field.fieldType === 'checkbox' && (
                                        <div className="flex items-center gap-2">
                                            <input type="checkbox" checked={responses[field.label] === 'true'}
                                                onChange={e => handleResponseChange(field.label, e.target.checked ? 'true' : 'false')}
                                                className="w-4 h-4 accent-purple-600" />
                                            <span className="text-sm text-gray-600">Yes</span>
                                        </div>
                                    )}
                                    {field.fieldType === 'file' && (
                                        <input type="file" required={field.required}
                                            onChange={e => {
                                                const file = e.target.files[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onloadend = () => handleResponseChange(field.label, reader.result);
                                                reader.readAsDataURL(file);
                                            }}
                                            className="w-full p-2 border rounded text-sm text-gray-600" />
                                    )}
                                </div>
                            ))}
                            <div>
                                <label className="block text-sm font-bold mb-1">Payment Proof <span className="text-red-500">*</span></label>
                                <input type="file" accept="image/*" onChange={handleProofUpload}
                                    className="w-full text-sm text-gray-600 border rounded p-2" />
                                {paymentProof && (
                                    <img src={paymentProof} alt="proof preview" className="mt-2 max-h-32 rounded border object-contain" />
                                )}
                                <p className="text-xs text-gray-400 mt-1">Upload a screenshot of your payment (max 5MB)</p>
                            </div>
                            <div className="flex gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setShowMerchForm(false)}
                                    className="flex-1 py-2 border rounded font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
                                <button type="submit" disabled={submitting}
                                    className="flex-1 py-2 bg-purple-600 text-white font-bold rounded hover:bg-purple-700 disabled:opacity-50">
                                    {submitting ? 'Placing Order...' : 'Place Order'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EventDetails;