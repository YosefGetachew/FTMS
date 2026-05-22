function Sidebar({ setActivePage }) {
  const user =
    JSON.parse(
      localStorage.getItem('user') || '{}'
    );

  const role = user?.role;

  return (
    <div className="sidebar">

      <h2>FTMS</h2>

      <ul>

        {role !== 'traveler' && (
          <li
            onClick={() =>
              setActivePage('dashboard')
            }
          >
            Dashboard
          </li>
        )}

        <li
          onClick={() =>
            setActivePage('travel-request')
          }
        >
          Travel Request
        </li>

        <li
          onClick={() =>
            setActivePage('submitted-requests')
          }
        >
          Submitted Requests
        </li>

        <li
          onClick={() =>
            setActivePage('notifications')
          }
        >
          Notifications
        </li>

        <li
          onClick={() =>
            setActivePage('reset-password')
          }
        >
          Reset Password
        </li>

        {role !== 'traveler' && (
          <li
            onClick={() =>
              setActivePage('reports')
            }
          >
            Reports
          </li>
        )}

        {role === 'admin' && (
          <li
            onClick={() =>
              setActivePage('settings')
            }
          >
            Settings
          </li>
        )}

        {role === 'admin' && (
          <li
            onClick={() =>
              setActivePage(
                'user-management'
              )
            }
          >
            User Management
          </li>
        )}

      </ul>

    </div>
  );
}

export default Sidebar;