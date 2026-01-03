import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { getOrganizationMembers, getPendingInvites, cancelOrganizationInvite } from '../api/organization';
import type { OrganizationMember, OrganizationInvite } from '../api/organization';
import InviteMemberModal from './InviteMemberModal';
import { Building2, Users, Mail, UserPlus, X, AlertCircle, Clock, Shield } from 'lucide-react';

// Role display names in Portuguese
const ROLE_LABELS: Record<string, string> = {
  'admin': 'Administrador',
  'regular_manager': 'Gerente',
  'regular_user': 'Usuário',
};

function getRoleLabel(role: string): string {
  return ROLE_LABELS[role] || role;
}

export default function OrganizationSettings() {
  const { token } = useAuth();
  const { activeOrganization } = useOrganization();
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingInvite, setCancellingInvite] = useState<number | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Check if current user has permission to invite (admin or manager)
  const canInvite = activeOrganization?.user_permissions?.includes('create_regular_users') ?? false;

  // Fetch members and invites
  useEffect(() => {
    async function fetchData() {
      if (!token || !activeOrganization) return;

      setLoading(true);
      setError(null);

      try {
        const [membersData, invitesData] = await Promise.all([
          getOrganizationMembers(activeOrganization.organization_id, { token }),
          canInvite
            ? getPendingInvites(activeOrganization.organization_id, { token })
            : Promise.resolve([]),
        ]);

        setMembers(membersData);
        setInvites(invitesData);
      } catch (err) {
        console.error('Failed to fetch organization data:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [token, activeOrganization, canInvite]);

  const handleCancelInvite = async (inviteId: number) => {
    if (!token || !activeOrganization || cancellingInvite) return;

    setCancellingInvite(inviteId);
    try {
      await cancelOrganizationInvite(activeOrganization.organization_id, inviteId, { token });
      setInvites((prev) => prev.filter((inv) => inv.invite_id !== inviteId));
    } catch (err) {
      console.error('Failed to cancel invite:', err);
      setError(err instanceof Error ? err.message : 'Erro ao cancelar convite');
    } finally {
      setCancellingInvite(null);
    }
  };

  const handleInviteCreated = (newInvite: OrganizationInvite) => {
    setInvites((prev) => [newInvite, ...prev]);
  };

  if (!activeOrganization) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-stone-300 mx-auto mb-4" />
        <p className="text-stone-500">Nenhuma organização selecionada</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Organization Info */}
      <div className="bg-white rounded-xl shadow-warm-sm border border-stone-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-wheat-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7 text-wheat-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-stone-900">{activeOrganization.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Shield className="w-4 h-4 text-stone-400" />
                <span className="text-sm text-stone-500">
                  Seu papel: <span className="font-medium text-stone-700">{getRoleLabel(activeOrganization.user_role)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-rust-50 border border-rust-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rust-500 flex-shrink-0" />
          <p className="text-rust-700">{error}</p>
        </div>
      )}

      {/* Members Section */}
      <div className="bg-white rounded-xl shadow-warm-sm border border-stone-200 overflow-hidden">
        <div className="p-6 border-b border-stone-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-stone-500" />
              <h3 className="text-lg font-semibold text-stone-900">Membros</h3>
              {!loading && (
                <span className="text-sm text-stone-500">({members.length})</span>
              )}
            </div>
            {canInvite && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="btn-primary text-sm"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-stone-500">
            <div className="animate-pulse">Carregando membros...</div>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {members.map((member) => (
              <div key={member.user_id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-wheat-400 to-wheat-600 flex items-center justify-center text-white font-medium text-sm">
                    {member.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-stone-900">{member.name}</p>
                    <p className="text-sm text-stone-500">{member.email}</p>
                  </div>
                </div>
                <span className="text-sm text-stone-600 bg-stone-100 px-3 py-1 rounded-full">
                  {getRoleLabel(member.user_role)}
                </span>
              </div>
            ))}
            {members.length === 0 && (
              <div className="p-6 text-center text-stone-500">
                Nenhum membro encontrado
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pending Invites Section (only for users with invite permission) */}
      {canInvite && (
        <div className="bg-white rounded-xl shadow-warm-sm border border-stone-200 overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-stone-500" />
              <h3 className="text-lg font-semibold text-stone-900">Convites Pendentes</h3>
              {!loading && invites.length > 0 && (
                <span className="text-sm text-stone-500">({invites.length})</span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-center text-stone-500">
              <div className="animate-pulse">Carregando convites...</div>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {invites.map((invite) => {
                const expiresAt = new Date(invite.expires_at);
                const isExpired = expiresAt < new Date();

                return (
                  <div key={invite.invite_id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isExpired ? 'bg-stone-100' : 'bg-wheat-50'}`}>
                        <Mail className={`w-5 h-5 ${isExpired ? 'text-stone-400' : 'text-wheat-600'}`} />
                      </div>
                      <div>
                        <p className={`font-medium ${isExpired ? 'text-stone-400' : 'text-stone-900'}`}>
                          {invite.email}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-stone-500">
                          <Clock className="w-3 h-3" />
                          <span>
                            {isExpired
                              ? 'Expirado'
                              : `Expira em ${expiresAt.toLocaleDateString('pt-BR')}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-stone-600 bg-stone-100 px-3 py-1 rounded-full">
                        {getRoleLabel(invite.role)}
                      </span>
                      <button
                        onClick={() => handleCancelInvite(invite.invite_id)}
                        disabled={cancellingInvite === invite.invite_id}
                        className="p-2 text-stone-400 hover:text-rust-500 transition-colors disabled:opacity-50"
                        title="Cancelar convite"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {invites.length === 0 && (
                <div className="p-6 text-center text-stone-500">
                  Nenhum convite pendente
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && activeOrganization && (
        <InviteMemberModal
          organizationId={activeOrganization.organization_id}
          onClose={() => setShowInviteModal(false)}
          onInviteCreated={handleInviteCreated}
        />
      )}
    </div>
  );
}
