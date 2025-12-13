// client/components/Header.js
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

const Header = () => {
    const router = useRouter();

    const handleLogout = () => {
        // 1. Remove the stored token
        localStorage.removeItem('accessToken');
        // 2. Redirect to the login page
        router.push('/login');
    };

    return (
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
            <div className="text-xl font-semibold text-indigo-600">Propel AI</div>
            <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition"
            >
                Logout
            </button>
        </header>
    );
};

export default Header;