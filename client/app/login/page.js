"use client"; // Marks this as a Client Component

import React, { useState } from 'react';
import { publicApi } from '../../utils/api';
import { useRouter } from 'next/navigation';
import { ModeToggle } from "@/components/mode-toggle";

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Call the FastAPI /auth/login endpoint
            const response = await publicApi.post('/auth/login', {
                email: email,
                password: password,
            });

            const token = response.data.access_token;

            // Store the token for authenticated API calls
            localStorage.setItem('accessToken', token);

            // Redirect to the dashboard
            router.push('/');

        } catch (err) {
            console.error('Login Failed:', err.response || err);
            setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground relative overflow-hidden">
            <div className="fixed top-4 right-4 animate-in fade-in slide-in-from-top-4 duration-700 delay-200">
                <ModeToggle />
            </div>
            <div className="fixed top-0 -z-10 h-full w-full bg-background [background:radial-gradient(125%_125%_at_50%_10%,var(--primary)_0%,transparent_50%)] opacity-30"></div>

            <div className="max-w-md w-full p-8 space-y-6 bg-card border border-border/50 shadow-2xl rounded-lg backdrop-blur-md">
                <h2 className="text-3xl font-extrabold text-center text-foreground">
                    Sign in to Propel AI
                </h2>
                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label htmlFor="email-address" className="sr-only">Email address</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-input bg-secondary/50 placeholder-muted-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-input bg-secondary/50 placeholder-muted-foreground text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-destructive text-sm font-medium">{error}</div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;