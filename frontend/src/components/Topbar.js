
function Topbar({ handleLogout }) {

  const user =
    JSON.parse(
      localStorage.getItem('user') || '{}'
    );

  const formatRole = (role) => {

    const roles = {

      admin: 'Admin',

      traveler: 'Traveler',

      state_minister:
        'State Minister',

      protocol: 'Protocol',

      office_head:
        'Office Head',

      minister: 'Minister',

    };

    return roles[role] || role;
  };

  const getInitials = (name) => {

    if (!name) return '?';

    return name
      .split(' ')
      .map((word) =>
        word.charAt(0)
      )
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (

    <div className="topbar">


      <div className="topbar-left">

        <div className="system-title">
          MoA Foreign Travel Management System
        </div>

        <div className="system-subtitle">
          Ministry of Agriculture Foreign Travel Registration Platform
        </div>

      </div>

      <div className="topbar-right">

        <div className="user-profile">

          <div className="user-avatar">

            {getInitials(
              user?.fullName
            )}

          </div>

          <div className="user-details">

            <div className="user-name">
              {user?.fullName}
            </div>

            <div className="user-role">
              {formatRole(
                user?.role
              )}
            </div>

          </div>

        </div>

        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          Logout
        </button>

      </div>

    </div>
  );
}

export default Topbar;