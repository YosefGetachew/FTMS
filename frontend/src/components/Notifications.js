import { useCallback, useEffect, useMemo, useState } from 'react';
import API from '../services/api';
import './Notifications.css';

function Notifications() {
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    if (!user?.email) return;

    setLoading(true);
    setError('');
    try {
      const response = await API.get('/notifications', {
        params: { email: user.email },
      });
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Notification Error:', error);
      setError('Unable to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      console.error(error);
    }
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <div>
          <span>FTMS Inbox</span>
          <h2>Notifications</h2>
          <p>Review task alerts, request updates, and account messages.</p>
        </div>

        <button type="button" onClick={fetchNotifications} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="notifications-summary">
        <div>
          <span>Total</span>
          <strong>{notifications.length}</strong>
        </div>
        <div>
          <span>Unread</span>
          <strong>{unreadCount}</strong>
        </div>
      </div>

      {error && <div className="notifications-error">{error}</div>}

      {!loading && notifications.length === 0 && (
        <div className="notifications-empty">
          <strong>No notifications found</strong>
          <span>New task and request updates will appear here.</span>
        </div>
      )}

      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification-card ${
            notification.is_read ? 'read' : 'unread'
          }`}
        >
          <div className="notification-content">
            <div className="notification-title-row">
              <h4>{notification.title}</h4>
              <span>
                {notification.is_read ? 'Read' : 'Unread'}
              </span>
            </div>

            <p>{notification.message}</p>

            <small>
              {new Date(notification.created_at).toLocaleString()}
            </small>
          </div>

          {!notification.is_read && (
            <button
              type="button"
              className="notification-read-btn"
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
