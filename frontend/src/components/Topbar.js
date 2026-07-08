import { useEffect, useMemo, useState } from 'react';
import ministryLogo from '../assets/ministry-logo.png';

function Topbar({ handleLogout }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const clock = useMemo(() => {
    const seconds = now.getSeconds();
    const minutes = now.getMinutes();
    const hours = now.getHours() % 12;

    return {
      secondDeg: seconds * 6,
      minuteDeg: minutes * 6 + seconds * 0.1,
      hourDeg: hours * 30 + minutes * 0.5,
      time: now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      date: now.toLocaleDateString([], {
        month: 'short',
        day: '2-digit',
      }),
    };
  }, [now]);

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

      pm_office: 'PM Office',

      director_general: 'Director General',

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

        <div className="topbar-logo-tile" aria-hidden="true">
          <img src={ministryLogo} alt="" />
        </div>

        <div className="topbar-title-block">

          <div className="system-title">
            MoA Foreign Travel Management System
          </div>

          <div className="system-subtitle">
            Ministry of Agriculture Foreign Travel Registration Platform
          </div>

        </div>

      </div>

      <div className="ethiopia-watch" aria-label={`Ethiopia time ${clock.time}`}>
        <div className="ethiopia-watch-face">
          <img src={ministryLogo} alt="" className="watch-logo" />
          <span className="watch-mark mark-12"></span>
          <span className="watch-mark mark-3"></span>
          <span className="watch-mark mark-6"></span>
          <span className="watch-mark mark-9"></span>
          <span
            className="watch-hand hour"
            style={{ transform: `translate(-50%, -100%) rotate(${clock.hourDeg}deg)` }}
          ></span>
          <span
            className="watch-hand minute"
            style={{ transform: `translate(-50%, -100%) rotate(${clock.minuteDeg}deg)` }}
          ></span>
          <span
            className="watch-hand second"
            style={{ transform: `translate(-50%, -100%) rotate(${clock.secondDeg}deg)` }}
          ></span>
          <span className="watch-pin"></span>
        </div>
        <div className="ethiopia-watch-copy">
          <strong>{clock.time}</strong>
          <span>{clock.date}</span>
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
