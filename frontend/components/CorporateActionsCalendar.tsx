"use client";

import { useMemo } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { enUS } from "date-fns/locale";

const locales = {
    "en-US": enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface CorporateAction {
    id: number;
    symbol: string;
    action_type: string;
    ex_date: string;
    amount: string | number;
    description: string;
}

interface CorporateActionsCalendarProps {
    actions: CorporateAction[];
}

export function CorporateActionsCalendar({ actions }: CorporateActionsCalendarProps) {
    const events = useMemo(() => {
        return actions.map(a => ({
            id: a.id,
            title: `${a.symbol} - ${a.action_type}`,
            start: new Date(a.ex_date),
            end: new Date(a.ex_date),
            resource: a,
            allDay: true,
        }));
    }, [actions]);

    const eventStyleGetter = (event: any) => {
        let backgroundColor = '#3b82f6';
        let borderColor = '#2563eb';

        switch (event.resource.action_type) {
            case 'DIVIDEND':
                backgroundColor = '#10b981'; // Green
                borderColor = '#059669';
                break;
            case 'SPLIT':
                backgroundColor = '#3b82f6'; // Blue
                borderColor = '#2563eb';
                break;
            case 'RIGHTS':
                backgroundColor = '#8b5cf6'; // Purple
                borderColor = '#7c3aed';
                break;
            case 'BONUS':
                backgroundColor = '#f97316'; // Orange
                borderColor = '#ea580c';
                break;
        }

        return {
            style: {
                backgroundColor,
                borderColor,
                borderRadius: '4px',
                opacity: 0.8,
                color: 'white',
                border: '0px',
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                padding: '2px 4px',
            }
        };
    };

    return (
        <div className="h-[700px] bg-white rounded-xl shadow-lg p-6 border border-slate-200">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
                defaultView={Views.MONTH}
                eventPropGetter={eventStyleGetter}
                tooltipAccessor={(event: any) => `${event.resource.description} - Amount: ${event.resource.amount}`}
                popup
                className="font-sans text-slate-700"
            />
        </div>
    );
}
