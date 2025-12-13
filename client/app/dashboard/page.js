// client/app/dashboard/page.js
"use client";

import React from 'react';
// Import the AuthWrapper we are about to create
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header'; // Placeholder for navigation

const DashboardContent = () => {
    // This is where your AI form and logic will go later
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800">Propel AI Dashboard</h1>
            <p className="mt-4 text-gray-600">Welcome back! You are securely logged in.</p>

            {/* Placeholder for the Idea Generation Form */}
            <div className="mt-8 p-6 bg-white shadow-lg rounded-lg">
                <h2 className="text-xl font-semibold">Generate New Ideas</h2>
                <p className="mt-2 text-sm text-gray-500">
                    (Your AI form and subscription check will appear here.)
                </p>
            </div>
        </div>
    );
};

const DashboardPage = () => {
    // The page must be wrapped to enforce authentication check
    return (
        <>
            {/* Header is outside the wrapper since we want it visible immediately */}
            <Header />
            <AuthWrapper>
                <DashboardContent />
            </AuthWrapper>
        </>
    );
};

export default DashboardPage;