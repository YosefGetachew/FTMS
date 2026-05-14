import { useState } from 'react';
import API from '../services/api';

function Login({ setIsLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await API.post('/login', {
        email,
        password,
      });

      localStorage.setItem(
        'user',
        JSON.stringify(
          response.data.user
        )
      );

      setIsLoggedIn(true);

    } catch (error) {
      console.error(error);

      alert('Login failed');
    }
  };

  return (
    <div className="login-container">

      <form
        className="login-form"
        onSubmit={handleLogin}
      >
        <h2>FTMS Login</h2>

        <input
          type="email"
          placeholder="Email"
          onChange={(e) =>
            setEmail(e.target.value)
          }
          required
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) =>
            setPassword(e.target.value)
          }
          required
        />

        <button type="submit">
          Login
        </button>

      </form>

    </div>
  );
}

export default Login;