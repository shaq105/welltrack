import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../lib/apiClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await apiClient.post('/api/auth/forgot-password', { email });
      setSubmitted(true);
    } catch {
      // Show success regardless to prevent email enumeration
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-sage-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-2 text-2xl font-bold text-teal-800">Forgot password</h1>

        {submitted ? (
          <div>
            <div className="mb-6 rounded-lg bg-teal-50 px-4 py-4 text-sm text-teal-800">
              If an account with that email exists, we&apos;ve sent a password reset link. Check
              your inbox.
            </div>
            <Link
              to="/login"
              className="block text-center text-sm font-medium text-teal-600 hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-sage-600">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-sage-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
              >
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-sage-600">
              <Link to="/login" className="font-medium text-teal-600 hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
