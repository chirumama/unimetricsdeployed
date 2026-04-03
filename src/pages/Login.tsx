import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getDefaultRouteForRole, getStoredUser, setStoredUser } from '@/lib/auth';
import { login } from '@/lib/api';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const user = getStoredUser();
    if (user) {
      navigate(getDefaultRouteForRole(user.role), { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(username.trim(), password);
      setStoredUser(response.user);
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
      navigate(from ?? getDefaultRouteForRole(response.user.role), { replace: true });
    } catch (loginError) {
      console.error('Login failed', loginError);
      const message = loginError instanceof Error ? loginError.message : 'Login failed.';
      if (message.includes('Unable to reach the API')) {
        setError('Server connection failed. Please check the deployed backend URL.');
      } else {
        setError('Invalid username or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          UniMetrics Dashboard
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          University and College Metrics Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Login to Continue</CardTitle>
            <CardDescription className="text-center">
              Use your username and password to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className="pl-10"
                    placeholder="Enter username"
                    autoComplete="username"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pl-10"
                    placeholder="Enter password"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-700">
                Admin login: `kuldeepyadav` / `12345678`
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
