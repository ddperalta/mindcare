import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card, LanguageSwitcher } from '../../components/common';
import { ROUTES } from '../../config/constants';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      navigate(ROUTES.THERAPIST_DASHBOARD); // Will redirect based on role
    } catch (err: any) {
      console.error('Login error:', err);
      setError(t('auth.login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 to-mint-500 p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <Card elevated className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-sage-900 mb-2">{t('auth.login.title')}</h1>
          <p className="text-sage-600">{t('auth.login.subtitle')}</p>
        </div>

        {error && (
          <div className="bg-coral-50 border border-coral-200 text-coral-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label={t('auth.login.email')}
            placeholder={t('auth.login.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="password"
            label={t('auth.login.password')}
            placeholder={t('auth.login.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                className="w-4 h-4 text-teal-500 border-sage-300 rounded focus:ring-teal-500"
              />
              <span className="ml-2 text-sm text-sage-600">{t('auth.login.rememberMe')}</span>
            </label>

            <Link
              to="/forgot-password"
              className="text-sm text-teal-600 hover:text-teal-700"
            >
              {t('auth.login.forgotPassword')}
            </Link>
          </div>

          <Button type="submit" variant="primary" isLoading={loading} className="w-full">
            {t('auth.login.signIn')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sage-600">
            {t('auth.login.noAccount')}{' '}
            <Link
              to={ROUTES.REGISTER}
              className="text-teal-600 hover:text-teal-700 font-semibold"
            >
              {t('auth.login.signUp')}
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
