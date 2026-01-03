import { useEffect, useState } from 'react';
import { getPendingInvites } from '../api/backoffice';
import { useAuth } from '../contexts/AuthContext';
import type { SystemInvite } from '../types/api';
import { Mail, Building2, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface InvitesListProps {
  refreshTrigger?: number;
}

export function InvitesList({ refreshTrigger }: InvitesListProps) {
  const { token } = useAuth();
  const [invites, setInvites] = useState<SystemInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInvites = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getPendingInvites({ token });
      setInvites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar convites');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, [token, refreshTrigger]);

  if (isLoading && invites.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
        <button
          onClick={loadInvites}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Convites Pendentes ({invites.length})
          </h2>
        </div>
        <button
          onClick={loadInvites}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {invites.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Nenhum convite pendente</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow divide-y divide-gray-100">
          {invites.map((invite) => {
            const expiresAt = new Date(invite.expires_at);
            const isExpired = expiresAt < new Date();
            const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={invite.invite_id}
                className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{invite.email}</div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Building2 className="w-4 h-4" />
                      {invite.organization_name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {isExpired ? (
                    <span className="text-sm text-red-600">Expirado</span>
                  ) : (
                    <span className="text-sm text-gray-500">
                      {daysLeft === 1 ? '1 dia restante' : `${daysLeft} dias restantes`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
