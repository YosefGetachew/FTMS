import logo from '../assets/ministry-logo.png';

function Sidebar({ setActivePage }) {
  const user = JSON.parse(
    localStorage.getItem('user') || '{}'
  );

  const role = user?.role;
  const isMinister = role === 'minister';

  return (
    <div className="sidebar">

      <div className="sidebar-header">
        <img
          src={logo}
          alt="Ministry Logo"
          className="sidebar-logo"
        />

        <div className="sidebar-title-group">
          <h2>MOA</h2>
          <p>Foreign Travel Management System</p>
        </div>
      </div>

      <ul>

        {role !== 'traveler' && (
          <li onClick={() => setActivePage('dashboard')}>
            Dashboard
          </li>
        )}

        {!isMinister && (
          <li onClick={() => setActivePage('travel-request')}>
            Travel Request
          </li>
        )}

        <li onClick={() => setActivePage('submitted-requests')}>
          Submitted Requests
        </li>

        {!isMinister && (
          <li onClick={() => setActivePage('notifications')}>
            Notifications
          </li>
        )}

        {!isMinister && (
          <li onClick={() => setActivePage('reset-password')}>
            Reset Password
          </li>
        )}

        {role !== 'traveler' && (
          <li onClick={() => setActivePage('reports')}>
            Reports
          </li>
        )}
{['admin', 'protocol'].includes(user?.role) && (
  <li onClick={() => setActivePage('audit-trail')}>
    Audit Trail
  </li>
)}
        {role === 'admin' && (
          <li onClick={() => setActivePage('settings')}>
            Settings
          </li>
        )}

        {role === 'admin' && (
          <li onClick={() => setActivePage('user-management')}>
            User Management
          </li>
        )}

      </ul>
    </div>
  );
}

export default Sidebar;