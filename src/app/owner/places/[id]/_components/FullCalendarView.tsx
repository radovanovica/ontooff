'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventContentArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';

interface Props {
  events: object[];
  onDateClick: (dateStr: string) => void;
  onEventClick?: (bookingId: string) => void;
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
        const bookingId = info.event.extendedProps.bookingId as string | undefined;
        if (bookingId && onEventClick) {
          onEventClick(bookingId);
        }
      }}
      eventContent={(info: EventContentArg) => {
        if (info.event.display === 'background') return null;
        const { activityType, activityLocation, registrationNumber } =
          info.event.extendedProps as {
            activityType?: string | null;
            activityLocation?: string | null;
            registrationNumber?: string;
          };
        const subtitle = [activityType, activityLocation].filter(Boolean).join(' · ');
        return (
          <div style={{ overflow: 'hidden', padding: '2px 4px', cursor: 'pointer', lineHeight: 1.3 }}>
            <div style={{
              fontWeight: 700,
              fontSize: '0.72rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {info.event.title}
            </div>
            {subtitle && (
              <div style={{
                fontSize: '0.66rem',
                opacity: 0.88,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {subtitle}
              </div>
            )}
            {registrationNumber && (
              <div style={{
                fontSize: '0.60rem',
                opacity: 0.72,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontFamily: 'monospace',
              }}>
                #{registrationNumber}
              </div>
            )}
          </div>
        );
      }}
      height="auto"
      dayMaxEvents={4}
      nowIndicator
    />
  );
}
