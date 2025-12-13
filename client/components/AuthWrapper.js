// client/components/AuthWrapper.js
"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import React from 'react';

const AuthWrapper = ({ children }) => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // Check for the token when the component mounts
        const token = localStorage.getItem('accessToken');

        if (!token) {
            // Token missing: User is NOT authenticated. Redirect to login.
            console.log("Token missing. Redirecting to login.");
            router.push('/login');
        } else {
            // Token found: User is authenticated.
            setIsAuthenticated(true);
        }

        setIsChecking(false);
    }, [router]);

    // Show a loader while checking the token status
    if (isChecking) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-500">Loading and verifying session...</p>
            </div>
        );
    }

    // Only render the child components (the Dashboard) if authenticated
    if (isAuthenticated) {
        return <>{children}</>;
    }

    // If not authenticated and not checking, nothing is rendered here 
    // because the user is already being redirected by router.push('/login')
    return null;
};

export default AuthWrapper;