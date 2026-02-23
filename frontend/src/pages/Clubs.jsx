import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Clubs = () => {
    const navigate = useNavigate();
    const [allClubs, setAllClubs] = useState([]);
    const [filteredClubs, setFilteredClubs] = useState([]);
    const [user, setUser] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');

    const categories = ['All', 'Technical', 'Cultural', 'Sports', 'Social Service', 'Academic', 'Other'];

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (!storedUser) {
            navigate('/login');
        } else {
            setUser(storedUser);
            fetchClubs();
        }
    }, [navigate]);

    const fetchClubs = async () => {
        try {
            const res = await axios.get(import.meta.env.VITE_API_URL + '/api/auth/organizers');
            setAllClubs(res.data);
            setFilteredClubs(res.data);
        } catch (error) {
            toast.error('Failed to fetch clubs');
        }
    };

    useEffect(() => {
        let result = allClubs;

        if (selectedCategory !== 'All') {
            result = result.filter(club => club.category === selectedCategory);
        }

        if (searchQuery) {
            result = result.filter(club =>
                club.organizerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                club.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredClubs(result);
    }, [searchQuery, selectedCategory, allClubs]);

    const toggleFollow = async (clubId) => {
        if (user.role !== 'participant') {
            toast.error('Only participants can follow clubs');
            return;
        }

        try {
            const token = user.token;
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const meResponse = await axios.get(import.meta.env.VITE_API_URL + '/api/auth/me', config);
            const currentFollowed = meResponse.data.user.followedClubs || [];
            
            const isFollowing = currentFollowed.some(c => (c._id || c) === clubId);
            let newFollowed;

            if (isFollowing) {
                newFollowed = currentFollowed.filter(c => (c._id || c) !== clubId);
            } else {
                newFollowed = [...currentFollowed.map(c => c._id || c), clubId];
            }

            // Update on backend
            await axios.put(import.meta.env.VITE_API_URL + '/api/auth/profile', {
                followedClubs: newFollowed
            }, config);

            // Update local storage
            const updatedUser = { ...user, followedClubs: newFollowed };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);

            toast.success(isFollowing ? 'Unfollowed successfully' : 'Following club!');
        } catch (error) {
            toast.error('Failed to update following status');
        }
    };

    const isFollowing = (clubId) => {
        if (!user || !user.followedClubs) return false;
        return user.followedClubs.some(c => (c._id || c) === clubId);
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <h1 className="text-3xl font-bold mb-6">Browse All Clubs</h1>

            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold mb-2">Search Clubs</label>
                        <input
                            type="text"
                            placeholder="Search by name or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">Filter by Category</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Results Count */}
            <p className="text-sm text-gray-600 mb-4">
                Showing <span className="font-bold">{filteredClubs.length}</span> club{filteredClubs.length !== 1 ? 's' : ''}
            </p>

            {/* Clubs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClubs.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        <p className="text-lg">No clubs found matching your criteria.</p>
                    </div>
                ) : (
                    filteredClubs.map(club => (
                        <div key={club._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition cursor-pointer" onClick={() => navigate(`/clubs/${club._id}`)}>
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-xl font-bold text-gray-800">{club.organizerName}</h3>
                                {user?.role === 'participant' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleFollow(club._id); }}
                                        className={`text-xs px-3 py-1 rounded-full font-bold border ${
                                            isFollowing(club._id)
                                                ? 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-red-50 hover:text-red-500'
                                                : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                                        }`}
                                    >
                                        {isFollowing(club._id) ? '✓ Following' : '+ Follow'}
                                    </button>
                                )}
                            </div>
                            
                            <div className="mb-4">
                                <span className="inline-block bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full font-semibold">
                                    {club.category || 'General'}
                                </span>
                            </div>

                            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                {club.description || 'No description available.'}
                            </p>

                            <div className="border-t pt-4 space-y-1">
                                {club.email && (
                                    <p className="text-xs text-gray-500 truncate">{club.email}</p>
                                )}
                                {club.website && (
                                    <a
                                        href={club.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline truncate block"
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {club.website}
                                    </a>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Clubs;