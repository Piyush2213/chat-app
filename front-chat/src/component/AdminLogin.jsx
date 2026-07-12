import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminLoginApi, setAdminToken } from '../services/Adminservice';

function AdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            toast.error('Enter both username and password');
            return;
        }

        setIsLoading(true);
        try {
            const { token } = await adminLoginApi(username.trim(), password);
            setAdminToken(token);
            toast.success('Logged in');
            navigate('/admin');
        } catch (error) {
            if (error?.response?.status === 401) {
                toast.error('Invalid credentials');
            } else {
                toast.error('Login failed');
            }
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#12121A]">
            <form
                onSubmit={handleSubmit}
                className="p-8 w-full max-w-sm flex flex-col gap-5 rounded-xl bg-[#181822] border border-white/10 shadow-xl"
            >
                <h1 className="text-xl font-semibold text-[#F2F1F7] text-center">Admin Login</h1>

                <div>
                    <label className="block text-xs text-[#8B899C] mb-1.5">Username</label>
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        type="text"
                        className="w-full px-3 py-2.5 rounded-lg bg-[#1F1F2B] border border-white/10 text-[#E8E6F0] text-sm focus:outline-none focus:border-[#4C3AED]/60"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-xs text-[#8B899C] mb-1.5">Password</label>
                    <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        className="w-full px-3 py-2.5 rounded-lg bg-[#1F1F2B] border border-white/10 text-[#E8E6F0] text-sm focus:outline-none focus:border-[#4C3AED]/60"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-lg bg-[#4C3AED] text-white text-sm font-medium hover:bg-[#5B4AF0] disabled:opacity-50 transition-colors"
                >
                    {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
            </form>
        </div>
    );
}

export default AdminLogin;