import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

const STATUS_BADGE = {
    Draft:     'bg-yellow-100 text-yellow-800',
    Published: 'bg-green-100 text-green-800',
    Ongoing:   'bg-blue-100 text-blue-800',
    Completed: 'bg-gray-100 text-gray-800',
    Cancelled: 'bg-red-100 text-red-800',
};

const TABS = ['Upcoming', 'Normal', 'Merchandise', 'Completed', 'Cancelled/Rejected'];

const Dashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [events, setEvents] = useState([]);
    const [activeTab, setActiveTab] = useState('Upcoming');
    const [ticket, setTicket] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) { navigate('/login'); return; }
        const userData = JSON.parse(storedUser);
        setUser(userData);
        fetchEvents(userData);
    }, [navigate]);

    const fetchEvents = async (userData) => {
        try {
            const config = { headers: { Authorization: `Bearer ${userData.token}` } };
            const res = await axios.get(import.meta.env.VITE_API_URL + '/api/events/my-registrations', config);
            setEvents(res.data);
        } catch (error) {
            console.error("Error fetching events:", error);
        }
    };

    const getTabEvents = () => {
        switch (activeTab) {
            case 'Upcoming':    return events.filter(e => ['Published', 'Ongoing'].includes(e.status) && e.myRegistration?.paymentStatus !== 'Rejected');
            case 'Normal':      return events.filter(e => e.type === 'normal');
            case 'Merchandise': return events.filter(e => e.type === 'merchandise');
            case 'Completed':   return events.filter(e => e.status === 'Completed');
            case 'Cancelled/Rejected': return events.filter(e => e.status === 'Cancelled' || e.myRegistration?.paymentStatus === 'Rejected');
            default:            return events;
        }
    };

    if (!user) return <div>Loading...</div>;

    const tabEvents = getTabEvents();

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">My Dashboard</h1>
                <button onClick={() => navigate('/events')}
                    className="bg-blue-600 text-white px-5 py-2 rounded font-bold hover:bg-blue-700 transition">
                    Browse Events
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b mb-6">
                {TABS.map(tab => (
                    <button key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-semibold rounded-t transition ${
                            activeTab === tab
                                ? 'bg-white border border-b-white border-gray-200 text-blue-600 -mb-px'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}>
                        {tab}
                    </button>
                ))}
            </div>

            {/* Event List */}
            {tabEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">No events in this category.</p>
            ) : (
                <div className="space-y-3">
                    {tabEvents.map(event => (
                        <div key={event._id}
                            className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:bg-gray-50 transition cursor-pointer"
                            onClick={() => navigate(`/events/${event._id}`)}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h4 className="font-bold text-base">{event.name}</h4>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_BADGE[event.status] || ''}`}>
                                        {event.status}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${event.type === 'normal' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                        {event.type}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                    {event.organizer?.organizerName || 'Unknown Organizer'} &bull; {new Date(event.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} &bull; {event.location || 'TBA'}
                                </p>
                            </div>
                            {/* Ticket / order status button */}
                            {(() => {
                                const ps = event.myRegistration?.paymentStatus;
                                if (event.type === 'merchandise' && ps === 'Pending') {
                                    return (
                                        <span className="ml-4 text-xs font-semibold bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded border border-yellow-200 whitespace-nowrap">
                                            Awaiting Approval
                                        </span>
                                    );
                                }
                                if (event.type === 'merchandise' && ps === 'Rejected') {
                                    return (
                                        <span className="ml-4 text-xs font-semibold bg-red-100 text-red-700 px-3 py-1.5 rounded border border-red-200 whitespace-nowrap"
                                            title={event.myRegistration?.paymentNote || ''}>
                                            Order Rejected
                                        </span>
                                    );
                                }
                                return (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setTicket({
                                                eventName: event.name,
                                                organizer: event.organizer?.organizerName || '',
                                                startDate: event.startDate,
                                                location: event.location,
                                                type: event.type,
                                                ticketId: event.myRegistration?.ticketId,
                                                registeredAt: event.myRegistration?.registeredAt
                                            });
                                        }}
                                        className="ml-4 text-xs font-mono bg-gray-100 text-gray-700 px-3 py-1.5 rounded border hover:bg-gray-200 transition whitespace-nowrap">
                                        Ticket #{String(event.myRegistration?.ticketId || '').slice(-8)}
                                    </button>
                                );
                            })()}
                        </div>
                    ))}
                </div>
            )}

            {/* Ticket Modal */}
            {ticket && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4"
                    onClick={() => setTicket(null)}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="bg-blue-600 text-white px-5 py-4 rounded-t-lg">
                            <p className="text-xs uppercase tracking-widest opacity-75 mb-0.5">
                                {ticket.type === 'merchandise' ? 'Purchase Ticket' : 'Event Ticket'}
                            </p>
                            <h2 className="text-lg font-bold leading-tight">{ticket.eventName}</h2>
                        </div>

                        {/* Body */}
                        <div className="px-5 py-4 space-y-2 text-sm">
                            {ticket.organizer && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Organizer</span>
                                    <span className="font-medium">{ticket.organizer}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-500">Date</span>
                                <span className="font-medium">{ticket.startDate ? new Date(ticket.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'TBA'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Location</span>
                                <span className="font-medium">{ticket.location || 'TBA'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Registered</span>
                                <span className="font-medium">{ticket.registeredAt ? new Date(ticket.registeredAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A'}</span>
                            </div>
                        </div>

                        <div className="mx-5 border-t border-dashed border-gray-300" />

                        {/* QR Code */}
                        <div className="flex flex-col items-center py-5 gap-3">
                            {ticket.ticketId ? (
                                <QRCodeSVG
                                    value={JSON.stringify({
                                        ticketId: ticket.ticketId,
                                        eventName: ticket.eventName,
                                        registeredAt: ticket.registeredAt
                                    })}
                                    size={140}
                                    level="M"
                                />
                            ) : (
                                <p className="text-xs text-gray-400">QR unavailable</p>
                            )}
                            <div className="text-center">
                                <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Ticket ID</p>
                                <p className="font-mono text-xs text-gray-700 break-all px-4 text-center">{ticket.ticketId || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="px-5 pb-5">
                            <button onClick={() => setTicket(null)}
                                className="w-full bg-gray-800 text-white py-2 rounded font-bold hover:bg-gray-900 transition text-sm">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
