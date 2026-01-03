import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createOrganizationInvite } from '../api/organization';
import type { OrganizationInvite } from '../api/organization';
import { X, Mail, Shield, AlertCircle, UserPlus } from 'lucide-react';

interface InviteMemberModalProps {
  organizationId: number;
  onClose: () => void;
  onInviteCreated: (invite: OrganizationInvite) => void;
}

// Role options matching backend roles
const ROLE_OPTIONS = [
  { value: 'regular_user', label: 'Usuário', description: 'Pode visualizar e criar transações' },
  { value: 'regular_manager', label: 'Gerente', description: 'Pode gerenciar categorias e padrões' },
  { value: 'admin', label: 'Administrador', description: 'Acesso completo, pode convidar membros' },
];

export default function InviteMemberModal({
  organizationId,
  onClose,
  onInviteCreated,
}: InviteMemberModalProps) {
  const { token } = useAuth();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('regular_user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isValidEmail || loading) return;

    setLoading(true);
    setError(null);

    try {
      const invite = await createOrganizationInvite(organizationId, email, role, { token });
      onInviteCreated(invite);
      onClose();
    } catch (err) {
      console.error('Failed to create invite:', err);
      setError(err instanceof Error ? err.message : 'Erro ao enviar convite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-wheat-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-wheat-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Convidar Membro</h2>
              <p className="text-sm text-stone-500">Envie um convite por email</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 transition-colors rounded-lg hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Error */}
          {error && (
            <div className="bg-rust-50 border border-rust-200 rounded-lg p-3 flex items-center gap-2 text-sm text-rust-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
                className="input pl-10"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-stone-400" />
                Papel
              </div>
            </label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                    ${role === option.value
                      ? 'border-wheat-500 bg-wheat-50'
                      : 'border-stone-200 hover:border-stone-300'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={role === option.value}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 accent-wheat-600"
                  />
                  <div>
                    <p className={`font-medium ${role === option.value ? 'text-wheat-700' : 'text-stone-900'}`}>
                      {option.label}
                    </p>
                    <p className="text-sm text-stone-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValidEmail || loading}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar Convite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
