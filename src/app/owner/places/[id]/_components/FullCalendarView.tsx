'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventContentArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';

interface Props {
  events: object[];
  onDateClick: (dateStr: string) => void;
  onEventClick?: (registrationNumber: string) => void;
}

export default function FullCalendarView({ events, onDateClick, onEventClick }: Props) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      events={events}
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek',
      }}
      dateClick={(info: DateClickArg) => onDateClick(info.dateStr)}
      eventClick={(info: EventClickArg) => {
        const regNum = info.event.extendedProps.registrationNumber as string | undefined;
        if (regNum && onEventClick) {
          onEventClick(regNum);
        }
      }}
      eventContent={(info: EventContentArg) => {
        if (info.event.display === 'background') return null;
        return (
          <div style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            padding: '1px 4px',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            {info.event.title}
          </div>
        );
      }}
      height="auto"
      dayMaxEvents={3}
      nowIndicator
    />
  );
}
