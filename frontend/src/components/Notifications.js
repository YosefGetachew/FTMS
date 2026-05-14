import { useEffect, useState } from 'react';
import API from '../services/api';

function Notifications() {
  const user = JSON.parse(localStorage.getItem('user'));
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (user?.email) {
      fetchNotifications();
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      console.log('Logged in user:', user.email);

      const response = await API.get(`/notifications/${user.email}`);
      console.log('Notifications:', response.data);

      setNotifications(response.data);
    } catch (error) {
      console.error('Notification Error:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="notifications-container">
      <h2>Notifications</h2>

      {notifications.length === 0 && <p>No notifications found.</p>}

      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification-card ${
            notification.is_read ? 'read' : 'unread'
          }`}
        >
          <h4>{notification.title}</h4>
          <p>{notification.message}</p>

          <small>
            {new Date(notification.created_at).toLocaleString()}
          </small>

          {!notification.is_read && (
            <button
              className="approve-btn"
              onClick={() => markAsRead(notification.id)}
            >
              Mark as Read
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default Notifications;
