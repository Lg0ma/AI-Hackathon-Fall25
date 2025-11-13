import { useState } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";

interface CalendarEvent {
    id: string;
    title: string;
    date: Date;
    time?: string;
    details?: string;
}

interface CalendarProps {
    events?: CalendarEvent[];
    onEventClick?: (event: CalendarEvent) => void;
    size?: 'small' | 'medium' | 'large';
}

const Calendar = ({ events = [], onEventClick, size = 'large' }: CalendarProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Size configurations
    const sizeClasses = {
        small: 'w-10 h-10',
        medium: 'w-12 h-12',
        large: 'w-14 h-14 sm:w-16 sm:h-16'
    };

    const iconSizeClasses = {
        small: 'w-5 h-5',
        medium: 'w-6 h-6',
        large: 'w-6 h-6 sm:w-7 sm:h-7'
    };

    // Get current month/year
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and number of days
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDayOfWeek = firstDayOfMonth.getDay();

    // Navigation functions
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Check if a date has events
    const hasEvents = (day: number) => {
        const date = new Date(year, month, day);
        return events.some(event => 
            event.date.getDate() === date.getDate() &&
            event.date.getMonth() === date.getMonth() &&
            event.date.getFullYear() === date.getFullYear()
        );
    };

    // Get events for a specific day
    const getEventsForDay = (day: number) => {
        const date = new Date(year, month, day);
        return events.filter(event => 
            event.date.getDate() === date.getDate() &&
            event.date.getMonth() === date.getMonth() &&
            event.date.getFullYear() === date.getFullYear()
        );
    };

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Generate calendar days
    const calendarDays = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarDays.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        calendarDays.push(day);
    }

    return (
        <>
            {/* Calendar Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`flex items-center justify-center ${sizeClasses[size]} rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg cursor-pointer transition-colors`}
                aria-label="Open Calendar"
            >
                <CalendarIcon className={iconSizeClasses[size]} />
            </button>

            {/* Calendar Modal */}
            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-800">Calendar</h2>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                                aria-label="Close Calendar"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Calendar Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Month Navigation */}
                            <div className="flex items-center justify-between mb-6">
                                <button
                                    onClick={goToPreviousMonth}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    ← Previous
                                </button>
                                <div className="text-center">
                                    <h3 className="text-xl font-semibold text-gray-800">
                                        {monthNames[month]} {year}
                                    </h3>
                                    <button
                                        onClick={goToToday}
                                        className="text-sm text-blue-600 hover:text-blue-700 mt-1"
                                    >
                                        Go to Today
                                    </button>
                                </div>
                                <button
                                    onClick={goToNextMonth}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                                >
                                    Next →
                                </button>
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-2 mb-4">
                                {/* Day Headers */}
                                {dayNames.map(day => (
                                    <div
                                        key={day}
                                        className="text-center font-semibold text-gray-600 py-2"
                                    >
                                        {day}
                                    </div>
                                ))}

                                {/* Calendar Days */}
                                {calendarDays.map((day, index) => {
                                    if (day === null) {
                                        return <div key={`empty-${index}`} className="p-2" />;
                                    }

                                    const dayEvents = getEventsForDay(day);
                                    const hasEvent = hasEvents(day);
                                    const isToday = 
                                        day === new Date().getDate() &&
                                        month === new Date().getMonth() &&
                                        year === new Date().getFullYear();

                                    return (
                                        <div
                                            key={day}
                                            className={`p-2 min-h-[80px] border border-gray-200 rounded-md ${
                                                isToday ? "bg-blue-50 border-blue-300" : ""
                                            } ${hasEvent ? "bg-yellow-50" : ""}`}
                                        >
                                            <div
                                                className={`text-sm font-semibold mb-1 ${
                                                    isToday ? "text-blue-600" : "text-gray-700"
                                                }`}
                                            >
                                                {day}
                                            </div>
                                            {dayEvents.length > 0 && (
                                                <div className="space-y-1">
                                                    {dayEvents.slice(0, 2).map(event => (
                                                        <div
                                                            key={event.id}
                                                            onClick={() => onEventClick?.(event)}
                                                            className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded cursor-pointer hover:bg-blue-200 truncate"
                                                            title={event.title}
                                                        >
                                                            {event.time && `${event.time} - `}
                                                            {event.title}
                                                        </div>
                                                    ))}
                                                    {dayEvents.length > 2 && (
                                                        <div className="text-xs text-gray-500">
                                                            +{dayEvents.length - 2} more
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Events List (if any events exist) */}
                            {events.length > 0 && (
                                <div className="mt-6 border-t border-gray-200 pt-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                        Upcoming Events
                                    </h3>
                                    <div className="space-y-2">
                                        {events
                                            .sort((a, b) => a.date.getTime() - b.date.getTime())
                                            .slice(0, 5)
                                            .map(event => (
                                                <div
                                                    key={event.id}
                                                    onClick={() => onEventClick?.(event)}
                                                    className="p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
                                                >
                                                    <div className="font-semibold text-gray-800">
                                                        {event.title}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        {event.date.toLocaleDateString()}
                                                        {event.time && ` at ${event.time}`}
                                                    </div>
                                                    {event.details && (
                                                        <div className="text-sm text-gray-500 mt-1">
                                                            {event.details}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* Placeholder when no events */}
                            {events.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <CalendarIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                    <p>No scheduled events</p>
                                    <p className="text-sm mt-1">
                                        Events will appear here once connected to the database
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Calendar;

