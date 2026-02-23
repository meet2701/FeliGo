import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const ClubDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [club, setClub] = useState(null);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [pastEvents, setPastEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        setUser(storedUser);
        fetchData(storedUser);
    }, [id]);

    const fetchData = async (storedUser) => {
        try {
            const [clubRes, eventsRes] = await Promise.all([
                axios.get(`${import.meta.env.VITE_API_URL}/api/auth/organizers/${id}`),
                axios.get(`${import.meta.env.VITE_API_URL}/api/events?organizer=${id}`)
            ]);

            setClub(clubRes.data);

            const publicEvents = eventsRes.data.filter(e =>
                ['Published', 'Ongoing', 'Completed'].includes(e.status)
            );
            setUpcomingEvents(publicEvents.filter(e => ['Published', 'Ongoing'].includes(e.status)));
            setPastEvents(publicEvents.filter(e => e.status === 'Completed'));
        } catch (error) {
            toast.error('Failed to load club details');
            navigate('/clubs');
        } finally {
            setLoading(false);
        }
    };

    const isFollowing = () => {
        if (!user?.followedClubs) return false;
        return user.followedClubs.some(c => (c._id || c) === id);
    };

    const toggleFollow = async () => {
        if (!user) {
            toast.error('Please log in to follow clubs');
            return navigate('/login');
        }
        if (user.role !== 'participant') {
            toast.error('Only participants can follow clubs');
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${user.token}` } };
            const meRes = await axios.get(import.meta.env.VITE_API_URL + '/api/auth/me', config);
            const currentFollowed = meRes.data.user.followedClubs || [];

            const following = currentFollowed.some(c => (c._id || c) === id);
            let newFollowed;
            if (following) {
                newFollowed = currentFollowed.map(c => c._id || c).filter(cid => cid !== id);
            } else {
                newFollowed = [...currentFollowed.map(c => c._id || c), id];
            }

            await axios.put(import.meta.env.VITE_API_URL + '/api/auth/profile', { followedClubs: newFollowed }, config);

            const updatedUser = { ...user, followedClubs: newFollowed };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);

            toast.success(following ? 'Unfollowed' : 'Now following');
        } catch {
            toast.error('Failed to update following status');
        }
    };

    const EventRow = ({ event }) => (
        <div
            onClick={() => navigate(`/events/${event._id}`)}
            className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 cursor-pointer transition"
        >
            <div className="flex-1 min-w-0 mr-4">
                <p className="font-semibold text-sm truncate">{event.name}</p>
                <p className="text-xs text-gray-500">{new Date(event.startDate).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })} &bull; {event.location || 'TBA'}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                    event.status === 'Ongoing' ? 'bg-green-100 text-green-800' :
                    event.status === 'Published' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-600'
                }`}>
                    {event.status}
                </span>
                <span className="text-xs font-semibold text-green-700">
                    {event.price === 0 ? 'FREE' : `\u20B9${event.price}`}
                </span>
            </div>
        </div>
    );

    if (loading) return <div className="text-center mt-10 text-gray-500">Loading...</div>;
    if (!club) return null;

    return (
        <div className="max-w-3xl mx-auto p-6 my-8">
            <button onClick={() => navigate(-1)} className="mb-4 text-blue-600 hover:underline text-sm font-semibold">
                Back
            </button>

            {/* Club Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold mb-1">{club.organizerName}</h1>
                        <span className="inline-block bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full font-semibold mb-3">
                            {club.category || 'General'}
                        </span>
                        {club.description && (
                            <p className="text-sm text-gray-600 mb-4">{club.description}</p>
                        )}
                        <div className="space-y-1 text-xs text-gray-500">
                            {(club.contactEmail || club.email) && <p>{club.contactEmail || club.email}</p>}
                            {club.website && (
                                <a
                                    href={club.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline block"
                                    onClick={e => e.stopPropagation()}
                                >
                                    {club.website}
                                </a>
                            )}
                        </div>
                    </div>
                    {user?.role === 'participant' && (
                        <button
                            onClick={toggleFollow}
                            className={`shrink-0 text-sm px-4 py-2 rounded-full font-bold border transition ${
                                isFollowing()
                                    ? 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-red-50 hover:text-red-500'
                                    : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                            }`}
                        >
                            {isFollowing() ? 'Following' : '+ Follow'}
                        </button>
                    )}
                </div>
            </div>

            {/* Upcoming / Active Events */}
            <div className="mb-6">
                <h2 className="text-base font-bold mb-3">
                    Upcoming Events
                    <span className="ml-2 text-sm text-gray-400 font-normal">({upcomingEvents.length})</span>
                </h2>
                {upcomingEvents.length === 0 ? (
                    <p className="text-sm text-gray-400">No upcoming events.</p>
                ) : (
                    <div className="space-y-2">
                        {upcomingEvents.map(e => <EventRow key={e._id} event={e} />)}
                    </div>
                )}
            </div>

            {/* Past Events */}
            <div>
                <h2 className="text-base font-bold mb-3">
                    Past Events
                    <span className="ml-2 text-sm text-gray-400 font-normal">({pastEvents.length})</span>
                </h2>
                {pastEvents.length === 0 ? (
                    <p className="text-sm text-gray-400">No past events.</p>
                ) : (
                    <div className="space-y-2">
                        {pastEvents.map(e => <EventRow key={e._id} event={e} />)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClubDetail;
