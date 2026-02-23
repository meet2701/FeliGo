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
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/events" element={<BrowseEvents />} />
            <Route path="/events/:id" element={<EventDetails />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/clubs" element={<Clubs />} />
            <Route path="/clubs/:id" element={<ClubDetail />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/edit-event/:id" element={<EditEvent />} />
            <Route path="/organizer/event/:id" element={<OrganizerEventDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/ongoing-events" element={<OngoingEvents />} />
            <Route path="/" element={<Login />} />
          </Routes>
      </Router>
    </>
  );
}

export default App;