import { useRef, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { Appointment } from '../../types';

interface AppointmentCalendarProps {
  appointments: Appointment[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (appointmentId: string) => void;
  patientNames: Map<string, string>;
  therapistNames?: Map<string, string>;
  initialView?: string;
}

const statusEventColors: Record<string, { backgroundColor: string; borderColor: string }> = {
  SCHEDULED: { backgroundColor: '#0d9488', borderColor: '#0f766e' },
  COMPLETED: { backgroundColor: '#16a34a', borderColor: '#15803d' },
  CANCELLED: { backgroundColor: '#a8a29e', borderColor: '#78716c' },
  NO_SHOW: { backgroundColor: '#dc2626', borderColor: '#b91c1c' },
};

export function AppointmentCalendar({
  appointments,
  onDateClick,
  onEventClick,
  patientNames,
  therapistNames,
  initialView,
}: AppointmentCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);

  // Determine responsive initial view
  const getInitialView = () => {
    if (initialView) return initialView;
    return window.innerWidth < 640 ? 'timeGridDay' : 'dayGridMonth';
  };

  useEffect(() => {
    const handleResize = () => {
      const api = calendarRef.current?.getApi();
      if (!api) return;
      if (window.innerWidth < 640) {
        if (api.view.type === 'dayGridMonth' || api.view.type === 'timeGridWeek') {
          api.changeView('timeGridDay');
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const events = appointments.map((apt) => {
    const patientName = patientNames.get(apt.patientId) || 'Paciente';
    const therapistName = therapistNames?.get(apt.therapistId);
    const title = therapistName
      ? `${patientName} (${therapistName})`
      : patientName;

    return {
      id: apt.id,
      title,
      start: apt.scheduledStart?.toDate?.() || new Date(),
      end: apt.scheduledEnd?.toDate?.() || new Date(),
      ...statusEventColors[apt.status],
      extendedProps: { appointment: apt },
    };
  });

  return (
    <div className="fc-wrapper">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={getInitialView()}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        locale="es"
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        allDaySlot={false}
        events={events}
        dateClick={(info) => onDateClick?.(info.date)}
        eventClick={(info) => onEventClick?.(info.event.id)}
        height="auto"
        expandRows={true}
        stickyHeaderDates={true}
        dayMaxEvents={3}
        nowIndicator={true}
        buttonText={{
          today: 'Hoy',
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
        }}
      />
    </div>
  );
}
