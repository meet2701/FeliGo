import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Fuse from 'fuse.js';

const BrowseEvents = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    const [events, setEvents] = useState([]);
    const [trending, setTrending] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [eligFilter, setEligFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [followedOnly, setFollowedOnly] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [eventsRes, trendingRes] = await Promise.all([
                    axios.get(import.meta.env.VITE_API_URL + '/api/events'),
                    axios.get(import.meta.env.VITE_API_URL + '/api/events/trending')
                ]);
                setEvents(eventsRes.data);
                setTrending(trendingRes.data);
            } catch {
                toast.error("Could not load events");
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const followedClubs = user?.followedClubs || [];
    const userInterests = (user?.interests || []).map(i => i.toLowerCase());
    const followedClubIds = followedClubs.map(c => c._id || c);

    const isFiltering = search || typeFilter !== 'all' || eligFilter !== 'all' || dateFrom || dateTo || followedOnly;

    // Fuse.js instance for fuzzy search on event name & organizer name
    const fuse = useMemo(() => new Fuse(events, {
        keys: ['name', 'organizer.organizerName'],
        threshold: 0.4,
        ignoreLocation: true,
    }), [events]);

    const filtered = (() => {
        let result = search
            ? fuse.search(search).map(r => r.item)
            : [...events];

        result = result.filter(event => {
            if (typeFilter !== 'all' && event.type !== typeFilter) return false;
            if (eligFilter !== 'all' && event.eligibility !== eligFilter) return false;
            if (dateFrom && new Date(event.startDate) < new Date(dateFrom)) return false;
            if (dateTo && new Date(event.startDate) > new Date(dateTo)) return false;
            if (followedOnly && !followedClubIds.includes(event.organizer?._id)) return false;
            return true;
        });

        if (!search && userInterests.length > 0) {
            result.sort((a, b) => {
                const aMatch = (a.tags || []).filter(t => userInterests.includes(t.toLowerCase())).length;
                const bMatch = (b.tags || []).filter(t => userInterests.includes(t.toLowerCase())).length;
                return bMatch - aMatch;
            });
        }

        return result;
    })();

    const clearFilters = () => {
        setSearch(''); setTypeFilter('all'); setEligFilter('all');
        setDateFrom(''); setDateTo(''); setFollowedOnly(false);
    };

    const EventCard = ({ event }) => (
        <div onClick={() => navigate(`/events/${event._id}`)}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer">
            <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${event.type === 'normal' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                    {event.type}
                </span>
                <span className="text-sm font-bold text-green-700">
                    {event.price === 0 ? 'FREE' : `\u20B9${event.price}`}
                </span>
            </div>
            <h3 className="font-bold text-base mb-1">{event.name}</h3>
            <p className="text-xs text-gray-500 mb-2 line-clamp-2">{event.description}</p>
            <div className="text-xs text-gray-400 space-y-0.5">
                <p>{new Date(event.startDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                <p>{event.location || 'TBA'} &bull; {event.eligibility}</p>
                {event.organizer?.organizerName && (
                    <p
                        className="text-blue-600 font-medium hover:underline cursor-pointer"
                        onClick={e => { e.stopPropagation(); navigate(`/clubs/${event.organizer._id}`); }}
                    >
                        {event.organizer.organizerName}
                    </p>
                )}
            </div>
        </div>
    );

    return (
        <div className="container mx-auto p-6 max-w-6xl">
            <button onClick={() => navigate(-1)} className="mb-4 text-blue-600 hover:underline text-sm font-semibold">Back</button>
            <h1 className="text-2xl font-bold mb-6">Browse Events</h1>

            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 space-y-3">
                <input
                    type="text"
                    placeholder="Search by event name or organizer..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full p-2 border rounded text-sm"
                />
                <div className="flex flex-wrap gap-3 items-center">
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="p-2 border rounded text-sm">
                        <option value="all">All Types</option>
                        <option value="normal">Normal</option>
                        <option value="merchandise">Merchandise</option>
                    </select>
                    <select value={eligFilter} onChange={e => setEligFilter(e.target.value)} className="p-2 border rounded text-sm">
                        <option value="all">All Eligibility</option>
                        <option value="Open to All">Open to All</option>
                        <option value="IIIT Only">IIIT Only</option>
                    </select>
                    <div className="flex items-center gap-1 text-sm">
                        <span className="text-gray-500">From</span>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="p-2 border rounded text-sm" />
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                        <span className="text-gray-500">To</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="p-2 border rounded text-sm" />
                    </div>
                    {user && (
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input type="checkbox" checked={followedOnly} onChange={e => setFollowedOnly(e.target.checked)} />
                            Followed Clubs Only
                        </label>
                    )}
                    {isFiltering && (
                        <button onClick={clearFilters} className="text-sm text-red-500 hover:underline">Clear filters</button>
                    )}
                </div>
            </div>

            {loading ? (
                <p className="text-center text-gray-500">Loading events...</p>
            ) : (
                <>
                    {/* Trending — only shown when no filters active */}
                    {trending.length > 0 && !isFiltering && (
                        <div className="mb-8">
                            <h2 className="text-lg font-bold mb-3">Trending (last 24h)</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                {trending.map(event => <EventCard key={event._id} event={event} />)}
                            </div>
                        </div>
                    )}

                    {/* All / Filtered */}
                    <div>
                        <h2 className="text-lg font-bold mb-3">
                            {isFiltering ? `Results (${filtered.length})` : 'All Events'}
                        </h2>
                        {filtered.length === 0 ? (
                            <p className="text-gray-500 text-sm">No events match your filters.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filtered.map(event => <EventCard key={event._id} event={event} />)}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default BrowseEvents;
