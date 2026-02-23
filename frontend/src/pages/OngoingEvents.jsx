import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const STATUS_BADGE = {
    Ongoing: 'bg-blue-100 text-blue-800',
};

const OngoingEvents = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (!user || user.role !== 'organizer') { navigate('/login'); return; }
        const config = { headers: { Authorization: `Bearer ${user.token}` } };
        axios.get(import.meta.env.VITE_API_URL + '/api/events/myevents', config)
            .then(res => setEvents(res.data.filter(e => e.status === 'Ongoing')))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-center mt-20 text-gray-500">Loading...</div>;

    return (
        <div className="max-w-5xl mx-auto p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Ongoing Events</h1>

            {events.length === 0 ? (
                <p className="text-gray-500 text-sm">No ongoing events at the moment.</p>
            ) : (
                <div className="space-y-3">
                    {events.map(event => (
                        <div key={event._id}
                            onClick={() => navigate(`/organizer/event/${event._id}`)}
                            className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:bg-gray-50 transition cursor-pointer">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <h4 className="font-bold text-base">{event.name}</h4>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${STATUS_BADGE.Ongoing}`}>
                                        Ongoing
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${event.type === 'normal' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                        {event.type}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500">
                                    {new Date(event.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} &ndash; {new Date(event.endDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OngoingEvents;
