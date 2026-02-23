import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const STATUS_BADGE = {
    Draft:     'bg-yellow-100 text-yellow-800',
    Published: 'bg-green-100 text-green-800',
    Ongoing:   'bg-blue-100 text-blue-800',
    Completed: 'bg-gray-100 text-gray-800',
    Cancelled: 'bg-red-100 text-red-800',
};

const OrganizerDashboard = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (!user || user.role !== 'organizer') { navigate('/login'); return; }
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        axios.get(import.meta.env.VITE_API_URL + '/api/events/myevents', config)
            .then(res => setEvents(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const completedEvents = events.filter(e => e.status === 'Completed');

    if (loading) return <div className="text-center mt-20 text-gray-500">Loading...</div>;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">

            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Organizer Dashboard</h1>
                <button
                    onClick={() => navigate('/create-event')}
                    className="bg-blue-600 text-white font-bold px-5 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                >
                    + Create Event
                </button>
            </div>

            {/* Events Carousel */}
            <section>
                <h2 className="text-lg font-bold text-gray-700 mb-3">Your Events</h2>
                {events.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border text-gray-400 text-sm">
                        No events yet. Click "Create Event" to get started.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {events.map(event => (
                            <div
                                key={event._id}
                                onClick={() => navigate(`/organizer/event/${event._id}`)}
                                className="bg-white rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-gray-800 text-base leading-tight flex-1 pr-2">{event.name}</h3>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_BADGE[event.status] || 'bg-gray-100'}`}>
                                        {event.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${event.type === 'normal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                        {event.type}
                                    </span>
                                    <span className="text-xs text-gray-400">{new Date(event.startDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
                                </div>
                                <p className="text-xs text-gray-500 truncate mb-3">{event.description}</p>
                                <div className="flex gap-2 border-t pt-3">
                                    <button
                                        onClick={e => { e.stopPropagation(); navigate(`/edit-event/${event._id}`); }}
                                        className="flex-1 text-xs font-semibold py-1.5 rounded border border-yellow-400 text-yellow-700 hover:bg-yellow-50 transition"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); navigate(`/organizer/event/${event._id}`); }}
                                        className="flex-1 text-xs font-semibold py-1.5 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 transition"
                                    >
                                        View
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ── Event Analytics */}
            <section>
                <h2 className="text-lg font-bold text-gray-700 mb-3">Event Analytics : Completed Events</h2>
                {completedEvents.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-xl border text-gray-400 text-sm">
                        Analytics will appear here once you have completed events.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {completedEvents.map(event => {
                            const totalReg = event.participants?.length || 0;
                            const approvedOrders = event.participants?.filter(p => p.paymentStatus === 'Approved').length || 0;
                            const attended = event.participants?.filter(p => p.attendanceMarked).length || 0;
                            const revenue = event.type === 'merchandise'
                                ? approvedOrders * (event.price || 0)
                                : totalReg * (event.price || 0);

                            return (
                                <div
                                    key={event._id}
                                    className="bg-white rounded-xl border shadow-sm p-5 cursor-pointer hover:shadow-md transition"
                                    onClick={() => navigate(`/organizer/event/${event._id}`)}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-gray-800">{event.name}</h3>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${event.type === 'normal' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {event.type}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {event.type === 'normal' && (
                                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                                                <p className="text-2xl font-bold text-blue-600">{totalReg}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">Registrations</p>
                                            </div>
                                        )}
                                        {event.type === 'merchandise' && (
                                            <div className="bg-purple-50 rounded-lg p-3 text-center">
                                                <p className="text-2xl font-bold text-purple-600">{approvedOrders}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">Sales</p>
                                            </div>
                                        )}
                                        <div className="bg-green-50 rounded-lg p-3 text-center">
                                            <p className="text-2xl font-bold text-green-600">{attended}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Attended</p>
                                        </div>
                                        <div className="bg-orange-50 rounded-lg p-3 text-center">
                                            <p className="text-2xl font-bold text-orange-500">₹{revenue}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Revenue</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                                            <p className="text-2xl font-bold text-gray-600">
                                                {totalReg > 0 ? `${Math.round((attended / totalReg) * 100)}%` : '0%'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">Attendance Rate</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

        </div>
    );
};

export default OrganizerDashboard;
