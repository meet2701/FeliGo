import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './pages/Navbar';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard.jsx';
import OrganizerDashboard from './pages/OrganizerDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import CreateEvent from './pages/CreateEvent.jsx';
import BrowseEvents from './pages/BrowseEvents'; 
import EventDetails from './pages/EventDetails';
import Profile from './pages/Profile';
import Onboarding from './pages/Onboarding.jsx';
import Clubs from './pages/Clubs';
import EditEvent from './pages/EditEvent';
import OrganizerEventDetail from './pages/OrganizerEventDetail';
import ClubDetail from './pages/ClubDetail';
import Notifications from './pages/Notifications';
import OngoingEvents from './pages/OngoingEvents';

// Route the /dashboard path based on role
const DashboardRoute = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return <Navigate to="/login" />;
    if (user.role === 'organizer') return <OrganizerDashboard />;
    return <Dashboard />;
};

// Generic guard: must be logged in
const PrivateRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return <Navigate to="/login" />;
    return children;
};

// Guard: admin only
const AdminRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return <Navigate to="/login" />;
    if (user.role !== 'admin') return <Navigate to="/dashboard" />;
    return children;
};

// Guard: organizer only
const OrganizerRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return <Navigate to="/login" />;
    if (user.role !== 'organizer') return <Navigate to="/dashboard" />;
    return children;
};

function App() {
  return (
    <>
      <Router>
          <Navbar />
          <ToastContainer position="top-right" autoClose={3000} />
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<DashboardRoute />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/create-event" element={<OrganizerRoute><CreateEvent /></OrganizerRoute>} />
            <Route path="/events" element={<BrowseEvents />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/clubs" element={<Clubs />} />
            <Route path="/clubs/:id" element={<ClubDetail />} />
            <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
            <Route path="/edit-event/:id" element={<OrganizerRoute><EditEvent /></OrganizerRoute>} />
            <Route path="/organizer/event/:id" element={<OrganizerRoute><OrganizerEventDetail /></OrganizerRoute>} />
            <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
            <Route path="/ongoing-events" element={<PrivateRoute><OngoingEvents /></PrivateRoute>} />
            <Route path="/" element={<Login />} />
          </Routes>
      </Router>
    </>
  );
}

export default App;