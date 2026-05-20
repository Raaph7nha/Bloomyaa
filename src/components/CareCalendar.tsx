import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Info, CheckCircle2, Sprout, Droplets, Leaf } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor: string;
  borderColor: string;
  allDay: boolean;
  extendedProps: {
    type: string;
    plantId: number;
  };
}

interface CareCalendarProps {
  token: string;
  onAuthError?: () => void;
}

export function CareCalendar({ token, onAuthError }: CareCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/reminders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 401) {
        onAuthError?.();
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (info: any) => {
    setSelectedEvent(info.event);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-serif font-bold text-primary mb-2">Agenda de Cuidados</h2>
          <p className="text-muted-foreground italic">Tu guía visual para mantener un jardín radiante.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-bold border border-blue-100">
            <Droplets className="w-3 h-3" /> Riego
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-full text-xs font-bold border border-green-100">
            <Sprout className="w-3 h-3" /> Fértil
          </div>
        </div>
      </div>

      <div className="glass rounded-[40px] p-8 shadow-2xl relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}
        
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek'
            }}
            events={events}
            eventClick={handleEventClick}
            height="auto"
            locale="es"
            buttonText={{
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana'
            }}
          />
        </div>
      </div>

      {selectedEvent && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 glass rounded-[32px] border-primary/10 shadow-xl flex items-start justify-between"
        >
          <div className="flex gap-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              selectedEvent.extendedProps.type === 'riego' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
            }`}>
              {selectedEvent.extendedProps.type === 'riego' ? <Droplets className="w-8 h-8" /> : <Leaf className="w-8 h-8" />}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                {selectedEvent.extendedProps.type === 'riego' ? 'Tarea de Riego' : 'Tarea de Fertilización'}
              </p>
              <h3 className="text-2xl font-serif font-bold text-primary mb-2">{selectedEvent.title}</h3>
              <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                <span className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {new Date(selectedEvent.start).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
                <span className="flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Programado automáticamente
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => setSelectedEvent(null)}
            className="p-3 hover:bg-muted rounded-full transition-colors"
          >
            <CheckCircle2 className="w-8 h-8 text-primary/20 hover:text-primary transition-colors" />
          </button>
        </motion.div>
      )}

      <style>{`
        .fc {
          --fc-button-bg-color: transparent;
          --fc-button-border-color: #e2e8f0;
          --fc-button-hover-bg-color: #f8fafc;
          --fc-button-hover-border-color: #cbd5e1;
          --fc-button-active-bg-color: #f1f5f9;
          --fc-button-active-border-color: #94a3b8;
          --fc-button-text-color: #475569;
          --fc-event-border-color: transparent;
          --fc-today-bg-color: rgba(var(--primary), 0.05);
          font-family: inherit;
        }
        .fc .fc-toolbar-title {
          font-family: 'Cormorant Garamond', serif;
          font-weight: 700;
          color: var(--primary);
          font-size: 1.5rem;
        }
        .fc .fc-button-primary {
          border-radius: 12px;
          text-transform: uppercase;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 8px 16px;
        }
        .fc .fc-button-primary:focus {
          box-shadow: none !important;
        }
        .fc-event {
          cursor: pointer;
          border-radius: 6px !important;
          padding: 2px 4px !important;
          font-size: 0.75rem !important;
          font-weight: 600 !important;
          margin-bottom: 2px !important;
        }
        .fc-day-today {
          background: rgba(34, 197, 94, 0.03) !important;
        }
        .fc-col-header-cell {
          padding: 12px 0 !important;
          color: #94a3b8 !important;
          font-size: 0.7rem !important;
          text-transform: uppercase !important;
          font-weight: 700 !important;
          letter-spacing: 0.1em !important;
        }
      `}</style>
    </div>
  );
}
