function Sidebar({ setActivePage }) {
const user =
  JSON.parse(
    localStorage.getItem('user') || '{}'
  );
  return (

    <div className="sidebar">

      <h2>FTMS</h2>

      <ul>

        <li
          onClick={() =>
            setActivePage('dashboard')
          }
        >
          Dashboard
        </li>

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
            setActivePage('reports')
          }
        >
          Reports
        </li>

        {user?.role === 'admin' && (

  <li
    onClick={() =>
      setActivePage('settings')
    }
  >
    Settings
    
  </li>

)}

{user?.role === 'admin' && (

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
<li
  onClick={() =>
    setActivePage('notifications')
  }
>
  Notifications
</li>
      </ul>

    </div>
    
  );
  
}

export default Sidebar;

