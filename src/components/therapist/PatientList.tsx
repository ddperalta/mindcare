import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { Card, Button } from '../common';
import { ROUTES } from '../../config/constants';

interface Patient {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  dateOfBirth?: any;
  relationshipStart?: any;
}

export function PatientList() {
  const { currentUser, customClaims } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && customClaims?.tenantId) {
      fetchPatients();
    }
  }, [currentUser, customClaims]);

  const fetchPatients = async () => {
    if (!currentUser || !customClaims?.tenantId) return;

    try {
      // Get all therapist-patient relationships for this therapist
      const relationshipsQuery = query(
        collection(db, 'therapist_patients'),
        where('therapistId', '==', currentUser.uid),
        where('status', '==', 'ACTIVE')
      );

      const relationshipsSnapshot = await getDocs(relationshipsQuery);

      // Fetch patient details for each relationship
      const patientPromises = relationshipsSnapshot.docs.map(async (relationshipDoc) => {
        const relationship = relationshipDoc.data();
        const patientId = relationship.patientId;

        // Get patient user document
        const userDoc = await getDoc(doc(db, 'users', patientId));
        const patientDoc = await getDoc(doc(db, 'patients', patientId));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const patientData = patientDoc.exists() ? patientDoc.data() : {};

          return {
            uid: patientId,
            email: userData.email,
            displayName: userData.displayName || 'Sin nombre',
            phone: patientData.phone,
            dateOfBirth: patientData.dateOfBirth,
            relationshipStart: relationship.relationshipStart,
          };
        }

        return null;
      });

      const patientsData = await Promise.all(patientPromises);
      const validPatients = patientsData.filter((p) => p !== null) as Patient[];

      setPatients(validPatients);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate?.() || new Date(timestamp);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateAge = (dateOfBirth: any) => {
    if (!dateOfBirth) return 'N/A';
    const birthDate = dateOfBirth.toDate?.() || new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  if (loading) {
    return (
      <Card elevated>
        <p className="text-sage-600">Cargando pacientes...</p>
      </Card>
    );
  }

  if (patients.length === 0) {
    return (
      <Card elevated>
        <h2 className="text-2xl font-semibold text-sage-900 mb-4">
          Lista de Pacientes
        </h2>
        <p className="text-sage-600">
          No hay pacientes registrados. Invita a tu primer paciente usando el botón "Invitar Nuevo Paciente".
        </p>
      </Card>
    );
  }

  return (
    <Card elevated>
      <h2 className="text-2xl font-semibold text-sage-900 mb-6">
        Lista de Pacientes ({patients.length})
      </h2>

      <div className="space-y-4">
        {patients.map((patient) => (
          <div
            key={patient.uid}
            className="p-4 border border-sage-200 rounded-xl hover:border-teal-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-sage-900">
                  {patient.displayName}
                </h3>
                <p className="text-sm text-sage-600 mt-1">{patient.email}</p>

                <div className="flex flex-wrap gap-4 mt-3 text-sm text-sage-600">
                  {patient.phone && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">📞</span>
                      {patient.phone}
                    </div>
                  )}
                  {patient.dateOfBirth && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">🎂</span>
                      {calculateAge(patient.dateOfBirth)} años
                    </div>
                  )}
                  {patient.relationshipStart && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium">📅</span>
                      Paciente desde {formatDate(patient.relationshipStart)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 ml-4">
                <Button
                  variant="secondary"
                  className="text-sm"
                  onClick={() => navigate(ROUTES.THERAPIST_PATIENT_DETAIL.replace(':id', patient.uid))}
                >
                  Ver Perfil
                </Button>
                <Button
                  variant="ghost"
                  className="text-sm"
                  onClick={() => navigate(ROUTES.THERAPIST_APPOINTMENTS + '?patientId=' + patient.uid)}
                >
                  Nueva Cita
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
