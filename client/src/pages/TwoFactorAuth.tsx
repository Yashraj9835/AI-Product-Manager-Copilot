import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Sparkles, ArrowLeft, CheckCircle, Clock, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export default function TwoFactorAuth() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [resendCount, setResendCount] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Timer for code expiration
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);

    // Auto-submit when 6 digits are entered
    if (value.length === 6) {
      handleVerify(value);
    }
  };

  const handleVerify = async (verifyCode?: string) => {
    const codeToVerify = verifyCode || code;

    if (!codeToVerify) {
      toast.error('Please enter the verification code');
      return;
    }

    if (codeToVerify.length !== 6) {
      toast.error('Verification code must be 6 digits');
      return;
    }

    setIsLoading(true);

    // Simulate API call to verify 2FA code
    setTimeout(() => {
      // Accept any 6-digit code for demo
      setIsVerified(true);
      toast.success('Two-factor authentication verified!');
      setIsLoading(false);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        localStorage.setItem('user', JSON.stringify({
          email: localStorage.getItem('pendingUser'),
          twoFactorVerified: true,
        }));
        localStorage.removeItem('pendingUser');
        localStorage.removeItem('authStep');
        setLocation('/');
      }, 2000);
    }, 1500);
  };

  const handleResendCode = async () => {
    if (resendCount >= 3) {
      toast.error('Maximum resend attempts reached. Please contact support.');
      return;
    }

    setIsLoading(true);
    setResendCount(prev => prev + 1);

    // Simulate API call to resend code
    setTimeout(() => {
      setTimeLeft(300);
      setCanResend(false);
      setCode('');
      toast.success('Verification code sent to your email');
      setIsLoading(false);
    }, 1000);
  };

  const handleBackToLogin = () => {
    setLocation('/login');
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
          {!isVerified && (
            <button
              onClick={handleBackToLogin}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-300 transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Back to Login</span>
            </button>
          )}

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
          {!isVerified ? (
            <>
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/20 border border-blue-500/30 mx-auto mb-4">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle className="text-2xl text-white text-center">Two-Factor Authentication</CardTitle>
                <CardDescription className="text-slate-400 text-center">
                  Enter the 6-digit code from your authenticator app or email
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <form onSubmit={(e) => { e.preventDefault(); handleVerify(); }} className="space-y-4">
                  {/* Verification Code Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Verification Code</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="000000"
                      value={code}
                      onChange={handleCodeChange}
                      maxLength={6}
                      className="text-center text-2xl tracking-widest bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 font-mono"
                      disabled={isLoading || timeLeft <= 0}
                      autoFocus
                    />
                    <p className="text-xs text-slate-500 text-center">
                      Enter the code from your authenticator app
                    </p>
                  </div>

                  {/* Timer */}
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span className={timeLeft <= 60 ? 'text-red-400 font-medium' : 'text-slate-400'}>
                      Code expires in {formatTime(timeLeft)}
                    </span>
                  </div>

                  {/* Verify Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || code.length !== 6 || timeLeft <= 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify Code'
                    )}
                  </Button>
                </form>

                {/* Resend Code */}
                <div className="border-t border-slate-600/50 pt-4">
                  <p className="text-xs text-slate-400 text-center mb-3">
                    Didn't receive the code?
                  </p>
                  <Button
                    onClick={handleResendCode}
                    disabled={isLoading || !canResend || resendCount >= 3}
                    variant="outline"
                    className="w-full border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-white gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Resend Code
                    {resendCount > 0 && <span className="text-xs">({resendCount}/3)</span>}
                  </Button>
                </div>

                {/* Security Info */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-blue-400 text-sm">Security Notice</h4>
                  <ul className="text-xs text-blue-300 space-y-1">
                    <li>• Never share your 2FA code with anyone</li>
                    <li>• We'll never ask for your code via email or phone</li>
                    <li>• Your code is only valid for 5 minutes</li>
                  </ul>
                </div>

                {/* Alternative Methods */}
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-2">Having trouble?</p>
                  <button
                    type="button"
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    Use backup code instead
                  </button>
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
                <CardTitle className="text-2xl text-white">Verified Successfully</CardTitle>
                <CardDescription className="text-slate-400">
                  Your identity has been verified. Redirecting to dashboard...
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                  <p className="text-sm text-green-400 font-medium">✓ Two-factor authentication verified</p>
                  <p className="text-xs text-slate-400 mt-2">
                    Your account is now secured with two-factor authentication.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                  Redirecting in a moment...
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
