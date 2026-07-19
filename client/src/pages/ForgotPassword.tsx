import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    // Simulate API call to send reset email
    setTimeout(() => {
      setIsSubmitted(true);
      toast.success('Password reset email sent successfully!');
      setIsLoading(false);
    }, 1500);
  };

  const handleBackToLogin = () => {
    setLocation('/login');
  };

  const handleTryAnother = () => {
    setEmail('');
    setIsSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBackToLogin}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-300 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Login</span>
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">PM Copilot</h1>
              <p className="text-xs text-slate-400">AI Product Manager</p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          {!isSubmitted ? (
            <>
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl text-white">Reset Your Password</CardTitle>
                <CardDescription className="text-slate-400">
                  Enter your email address and we'll send you a link to reset your password.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      We'll send a password reset link to this email address.
                    </p>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Reset Link
                      </>
                    )}
                  </Button>
                </form>

                {/* Help Text */}
                <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4">
                  <p className="text-xs text-slate-400">
                    <span className="font-medium text-slate-300">Didn't receive an email?</span>
                    <br />
                    Check your spam folder or try another email address.
                  </p>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-4 text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center animate-pulse">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl text-white">Check Your Email</CardTitle>
                <CardDescription className="text-slate-400">
                  We've sent a password reset link to <span className="font-medium text-slate-300">{email}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Success Message */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
                  <h3 className="font-medium text-green-400 text-sm">Password reset email sent!</h3>
                  <ul className="text-xs text-slate-400 space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>Check your email inbox for the reset link</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>The link will expire in 24 hours</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-400 mt-0.5">✓</span>
                      <span>If you don't see it, check your spam folder</span>
                    </li>
                  </ul>
                </div>

                {/* Next Steps */}
                <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4">
                  <p className="text-xs text-slate-400 mb-3">
                    <span className="font-medium text-slate-300">What's next?</span>
                  </p>
                  <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside">
                    <li>Click the link in your email</li>
                    <li>Enter your new password</li>
                    <li>Log in with your new password</li>
                  </ol>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleBackToLogin}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    Back to Login
                  </Button>
                  <Button
                    onClick={handleTryAnother}
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  >
                    Try Another Email
                  </Button>
                </div>

                {/* Resend Option */}
                <div className="text-center">
                  <p className="text-xs text-slate-500">
                    Didn't receive the email?{' '}
                    <button
                      onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                      className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                    >
                      Resend
                    </button>
                  </p>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <div className="flex items-center justify-center gap-4">
            <button className="hover:text-slate-400 transition-colors">Privacy Policy</button>
            <span>•</span>
            <button className="hover:text-slate-400 transition-colors">Terms of Service</button>
          </div>
        </div>
      </div>
    </div>
  );
}
