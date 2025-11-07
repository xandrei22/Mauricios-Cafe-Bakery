import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle, Mail, RefreshCw } from 'lucide-react';

const CustomerEmailVerification: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [verifying, setVerifying] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const [attemptsRemaining, setAttemptsRemaining] = useState(3);
    const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    // Check authentication status immediately on component mount
    useEffect(() => {
        const checkAuthImmediately = async () => {
            try {
                const response = await fetch(`${API_URL}/api/customer/profile`, {
                    credentials: 'omit'
                });
                if (response.ok) {
                    console.log('✅ User already authenticated - redirecting to dashboard');
                    navigate('/customer/dashboard');
                    return;
                }
            } catch (error) {
                console.log('🔍 User not authenticated, proceeding with verification');
            }
        };
        
        checkAuthImmediately();
    }, []);

    useEffect(() => {
        const token = searchParams.get('token');
        console.log('🔍 useEffect triggered with token:', token);
        console.log('🔍 hasAttemptedVerification:', hasAttemptedVerification);
        console.log('🔍 Current state - success:', success, 'error:', error, 'verifying:', verifying);
        
        if (!token) {
            setError('No verification token provided');
            setVerifying(false);
            return;
        }

        // Check if user is already authenticated (can access dashboard)
        // If they can access dashboard, verification is successful
        const checkAuthStatus = async () => {
            try {
                console.log('🔍 Checking authentication status...');
                const response = await fetch(`${API_URL}/api/customer/profile`, {
                    credentials: 'omit'
                });
                console.log('🔍 Auth check response status:', response.status);
                
                if (response.ok) {
                    console.log('✅ User is already authenticated - verification successful');
                    setSuccess(true);
                    setError(null);
                    setVerifying(false);
                    // Automatically redirect to dashboard since user is already authenticated
                    setTimeout(() => {
                        navigate('/customer/dashboard');
                    }, 1000);
                    return true; // Return true to indicate user is authenticated
                } else {
                    console.log('🔍 User not authenticated, status:', response.status);
                    return false;
                }
            } catch (error) {
                console.log('🔍 User not authenticated, error:', error);
                return false;
            }
        };

        // Only verify if we haven't already attempted verification and we're not already in a success state
        if (!hasAttemptedVerification && !success && !error) {
            console.log('🔍 Starting verification process');
            setHasAttemptedVerification(true);
            
            // First check if user is already authenticated
            checkAuthStatus().then((isAuthenticated) => {
                console.log('🔍 Authentication check result:', isAuthenticated);
                // If not authenticated, proceed with verification
                if (!isAuthenticated && !success) {
                    console.log('🔍 Proceeding with email verification...');
                    verifyEmail(token);
                }
            });
        } else {
            console.log('🔍 Verification already attempted or completed, skipping');
        }
    }, [searchParams, hasAttemptedVerification, success, error]);

    const verifyEmail = async (token: string) => {
        const timestamp = new Date().toISOString();
        console.log(`🔍 [${timestamp}] Verifying email with token:`, token);
        console.log(`🔍 [${timestamp}] API URL:`, `${API_URL}/api/customer/verify-email`);
        console.log(`🔍 [${timestamp}] Current state before verification:`, { success, error, verifying });
        
        // Prevent verification if already successful
        if (success) {
            console.log('🔍 [${timestamp}] Already successful, skipping verification');
            return;
        }
        
        try {
            // Test if API is reachable first
            try {
                const testResponse = await fetch(`${API_URL}/api/health`);
                console.log('🔍 API health check:', testResponse.status);
            } catch (testError) {
                console.log('🔍 API health check failed:', testError);
            }
            
            // Test if the verification endpoint is reachable
            try {
                const testVerificationResponse = await fetch(`${API_URL}/api/customer/verify-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token: 'test' })
                });
                console.log('🔍 Verification endpoint test:', testVerificationResponse.status);
            } catch (testVerificationError) {
                console.log('🔍 Verification endpoint test failed:', testVerificationError);
            }
            
            const response = await fetch(`${API_URL}/api/customer/verify-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token })
            });

            console.log('🔍 Raw response status:', response.status);
            console.log('🔍 Response headers:', Object.fromEntries(response.headers.entries()));

            const data = await response.json();
            console.log('🔍 Parsed response data:', data);
            console.log('🔍 Response OK:', response.ok);
            console.log('🔍 Data success:', data.success);
            console.log('🔍 Data message:', data.message);

            // Check for successful verification
            if (response.ok) {
                // Check if verification was successful or already verified
                if (data.success || 
                    data.message?.includes('already verified') || 
                    data.message?.includes('Email already verified') ||
                    data.message?.includes('verified successfully')) {
                    console.log('✅ Email verification successful - setting success state');
                    setSuccess(true);
                    setError(null);
                } else {
                    console.log('❌ Verification response OK but not successful:', data);
                    setError(data.message || 'Verification failed');
                    setSuccess(false);
                }
            } else {
                console.log('❌ Email verification failed:', data.message);
                console.log('❌ Response not OK');
                console.log('❌ Full response object:', { status: response.status, statusText: response.statusText, data });
                
                setError(data.message || 'Verification failed');
                setSuccess(false);
            }
        } catch (error) {
            console.error('❌ Error verifying email:', error);
            setError('Network error occurred during verification');
        } finally {
            setVerifying(false);
        }
    };

    const resendVerification = async () => {
        const email = searchParams.get('email');
        if (!email) {
            setError('Email address is required to resend verification');
            return;
        }

        setResending(true);
        try {
            const response = await fetch(`${API_URL}/api/customer/resend-verification`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setError(null);
                setAttemptsRemaining(data.attemptsRemaining || 0);
                alert('Verification email sent successfully! Please check your email.');
            } else if (response.status === 429 && data.cooldown) {
                setCooldown(data.remainingTime || 60);
                setError(data.message || 'Please wait before requesting another verification email.');
                
                // Start cooldown timer
                const timer = setInterval(() => {
                    setCooldown(prev => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                setError(data.message || 'Failed to resend verification email');
            }
        } catch (error) {
            console.error('Error resending verification:', error);
            setError('Network error occurred while resending verification');
        } finally {
            setResending(false);
        }
    };

    const handleRedirect = () => {
        navigate('/customer-login');
    };

    if (verifying) {
        return (
            <div className="min-h-screen bg-[#f8ede3] flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#a87437] mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-[#2D1810] mb-2">Verifying your email...</h2>
                    <p className="text-[#6B5B5B]">Please wait while we verify your email address.</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-[#f8ede3] flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-[#2D1810] mb-2">Email Verified Successfully!</h2>
                    <p className="text-[#6B5B5B] mb-6">
                        Your email address has been verified. You can now log in to your account.
                    </p>
                    <button
                        onClick={handleRedirect}
                        className="w-full bg-[#a87437] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#8f652f] transition-colors"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f8ede3] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
                <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-[#2D1810] mb-2">Verification Failed</h2>
                <p className="text-[#6B5B5B] mb-6">
                    {error || 'There was an error verifying your email address.'}
                </p>
                
                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/customer-login')}
                        className="w-full bg-[#a87437] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#8f652f] transition-colors"
                    >
                        Go to Login
                    </button>
                    
                    <button
                        onClick={resendVerification}
                        disabled={resending || cooldown > 0 || attemptsRemaining <= 0}
                        className="w-full bg-[#6B5B5B] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#5a4a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {resending ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : cooldown > 0 ? (
                            <>
                                <Mail className="h-4 w-4" />
                                Wait {cooldown}s
                            </>
                        ) : attemptsRemaining <= 0 ? (
                            <>
                                <Mail className="h-4 w-4" />
                                No attempts remaining
                            </>
                        ) : (
                            <>
                                <Mail className="h-4 w-4" />
                                Resend Verification Email ({attemptsRemaining} left)
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomerEmailVerification;
