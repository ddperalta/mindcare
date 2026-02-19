import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { Card, Button } from '../common';

interface EditForm {
  displayName: string;
  email: string;
  specialization: string; // comma-separated string, split on save
}

interface UserData {
  uid: string;
  email: string;
  displayName: string | null;
  role: 'THERAPIST' | 'PATIENT' | 'ADMIN';
  createdAt: any;
}

interface TherapistData {
  uid: string;
  isVerified: boolean;
  specialization: string[];
  patientCount: number;
}

interface EnrichedUser extends UserData {
  // Therapist enrichment
  isVerified?: boolean;
  specialization?: string[];
  patientCount?: number;
  // Patient enrichment
  therapistName?: string;
}

export function UserManagementList() {
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<'ALL' | 'THERAPIST' | 'PATIENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingUid, setTogglingUid] = useState<string | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ displayName: '', email: '', specialization: '' });
  const [savingUid, setSavingUid] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const [usersSnapshot, therapistsSnapshot, relationsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'therapists')),
        getDocs(collection(db, 'therapist_patients')),
      ]);

      // Build therapist data map
      const therapistMap = new Map<string, TherapistData>();
      therapistsSnapshot.docs.forEach(d => {
        const data = d.data();
        therapistMap.set(d.id, {
          uid: d.id,
          isVerified: data.isVerified || false,
          specialization: data.specialization || [],
          patientCount: 0,
        });
      });

      // Count active patients per therapist
      relationsSnapshot.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'ACTIVE' && therapistMap.has(data.therapistId)) {
          therapistMap.get(data.therapistId)!.patientCount++;
        }
      });

      // Build user name map for patient->therapist name lookup
      const userNameMap = new Map<string, string>();
      usersSnapshot.docs.forEach(d => {
        const data = d.data();
        userNameMap.set(d.id, data.displayName || data.email);
      });

      // Build patient->therapist name map
      const patientTherapistMap = new Map<string, string>();
      relationsSnapshot.docs.forEach(d => {
        const data = d.data();
        if (data.status === 'ACTIVE') {
          patientTherapistMap.set(
            data.patientId,
            userNameMap.get(data.therapistId) || 'Desconocido'
          );
        }
      });

      // Enrich users
      const enrichedUsers: EnrichedUser[] = usersSnapshot.docs
        .map(d => {
          const data = d.data() as UserData;
          const user: EnrichedUser = {
            uid: d.id,
            email: data.email,
            displayName: data.displayName,
            role: data.role,
            createdAt: data.createdAt,
          };

          if (data.role === 'THERAPIST') {
            const therapist = therapistMap.get(d.id);
            if (therapist) {
              user.isVerified = therapist.isVerified;
              user.specialization = therapist.specialization;
              user.patientCount = therapist.patientCount;
            }
          }

          if (data.role === 'PATIENT') {
            user.therapistName = patientTherapistMap.get(d.id);
          }

          return user;
        })
        .filter(u => u.role !== 'ADMIN');

      setUsers(enrichedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerification = async (user: EnrichedUser) => {
    const newVerified = !user.isVerified;
    const action = newVerified ? 'verificar' : 'revocar la verificación de';
    if (!confirm(`¿Estás seguro de que deseas ${action} a ${user.displayName || user.email}?`)) {
      return;
    }

    setTogglingUid(user.uid);
    try {
      const setCustomClaimsFn = httpsCallable(functions, 'setCustomClaims');
      await setCustomClaimsFn({
        uid: user.uid,
        claims: {
          role: 'THERAPIST',
          isVerified: newVerified,
          tenantId: `tenant_${user.uid}`,
        },
      });

      // Cloud Function handles the `true` case for therapists doc,
      // but for un-verifying we need to update Firestore directly
      if (!newVerified) {
        await updateDoc(doc(db, 'therapists', user.uid), {
          isVerified: false,
        });
      }

      // Update local state
      setUsers(prev =>
        prev.map(u =>
          u.uid === user.uid ? { ...u, isVerified: newVerified } : u
        )
      );
    } catch (error) {
      console.error('Error toggling verification:', error);
      alert('Error al cambiar el estado de verificación');
    } finally {
      setTogglingUid(null);
    }
  };

  const startEditing = (user: EnrichedUser) => {
    setEditingUid(user.uid);
    setEditForm({
      displayName: user.displayName || '',
      email: user.email,
      specialization: (user.specialization || []).join(', '),
    });
  };

  const cancelEditing = () => {
    setEditingUid(null);
  };

  const handleSaveEdit = async (user: EnrichedUser) => {
    setSavingUid(user.uid);
    try {
      const adminUpdateUserFn = httpsCallable(functions, 'adminUpdateUser');
      const payload: any = {
        uid: user.uid,
        displayName: editForm.displayName.trim(),
        email: editForm.email.trim(),
      };
      if (user.role === 'THERAPIST') {
        payload.specialization = editForm.specialization
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
      }
      await adminUpdateUserFn(payload);

      setUsers(prev =>
        prev.map(u =>
          u.uid === user.uid
            ? {
                ...u,
                displayName: payload.displayName,
                email: payload.email,
                ...(user.role === 'THERAPIST' && { specialization: payload.specialization }),
              }
            : u
        )
      );
      setEditingUid(null);
    } catch (error: any) {
      console.error('Error saving user:', error);
      alert(error.message || 'Error al guardar los cambios');
    } finally {
      setSavingUid(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredUsers = users.filter(user => {
    if (filterRole !== 'ALL' && user.role !== filterRole) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (user.displayName || '').toLowerCase();
      const email = user.email.toLowerCase();
      if (!name.includes(q) && !email.includes(q)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <Card>
        <p className="text-sage-600">Cargando usuarios...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="label mb-2 block text-sm">Filtrar por Rol</label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value as any)}
              className="input-field text-sm"
            >
              <option value="ALL">Todos</option>
              <option value="THERAPIST">Terapeuta</option>
              <option value="PATIENT">Paciente</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="label mb-2 block text-sm">Buscar por nombre o email</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="input-field text-sm w-full"
            />
          </div>

          <div className="flex items-end">
            <p className="text-sm text-sage-600">
              Mostrando {filteredUsers.length} de {users.length} usuarios
            </p>
          </div>
        </div>
      </Card>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <Card>
            <p className="text-sage-600 text-center py-8">
              No se encontraron usuarios con los filtros seleccionados
            </p>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.uid} elevated>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Role badges */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-lg border ${
                        user.role === 'THERAPIST'
                          ? 'bg-teal-100 text-teal-800 border-teal-200'
                          : 'bg-mint-100 text-mint-800 border-mint-200'
                      }`}
                    >
                      {user.role === 'THERAPIST' ? '👨‍⚕️ Terapeuta' : '🧑‍⚕️ Paciente'}
                    </span>
                    {user.role === 'THERAPIST' && (
                      <span
                        className={`text-xs px-2 py-1 rounded-lg border ${
                          user.isVerified
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        }`}
                      >
                        {user.isVerified ? '✓ Verificado' : '⏳ Sin verificar'}
                      </span>
                    )}
                  </div>

                  {/* Edit form or read view */}
                  {editingUid === user.uid ? (
                    <div className="space-y-3">
                      <div>
                        <label className="label mb-1 block text-xs">Nombre</label>
                        <input
                          type="text"
                          value={editForm.displayName}
                          onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                          className="input-field text-sm w-full"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="label mb-1 block text-xs">Email</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="input-field text-sm w-full"
                        />
                      </div>
                      {user.role === 'THERAPIST' && (
                        <div>
                          <label className="label mb-1 block text-xs">Especializaciones (separadas por coma)</label>
                          <input
                            type="text"
                            value={editForm.specialization}
                            onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                            className="input-field text-sm w-full"
                            placeholder="Ej: Ansiedad, Depresión, Trauma"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          onClick={() => handleSaveEdit(user)}
                          isLoading={savingUid === user.uid}
                          className="text-sm"
                        >
                          Guardar
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={cancelEditing}
                          className="text-sm"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-lg font-semibold text-sage-900">
                        {user.displayName || 'Sin nombre'}
                      </p>
                      <p className="text-sm text-sage-600">{user.email}</p>

                      {user.role === 'THERAPIST' && (
                        <div className="mt-2">
                          {user.specialization && user.specialization.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {user.specialization.map((spec) => (
                                <span
                                  key={spec}
                                  className="text-xs px-2 py-0.5 bg-sage-100 text-sage-700 rounded-full"
                                >
                                  {spec}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-sm text-sage-500">
                            Pacientes activos: {user.patientCount || 0}
                          </p>
                        </div>
                      )}

                      {user.role === 'PATIENT' && user.therapistName && (
                        <p className="text-sm text-sage-500 mt-1">
                          Terapeuta: {user.therapistName}
                        </p>
                      )}

                      <p className="text-sm text-sage-400 mt-2">
                        Creado: {formatDate(user.createdAt)}
                      </p>
                    </>
                  )}
                </div>

                {/* Actions */}
                {editingUid !== user.uid && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      onClick={() => startEditing(user)}
                      className="text-sm text-sage-600 hover:bg-sage-100"
                    >
                      ✏️ Editar
                    </Button>
                    {user.role === 'THERAPIST' && (
                      <Button
                        variant={user.isVerified ? 'ghost' : 'primary'}
                        onClick={() => handleToggleVerification(user)}
                        isLoading={togglingUid === user.uid}
                        className="text-sm"
                      >
                        {user.isVerified ? 'Revocar' : 'Verificar'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
