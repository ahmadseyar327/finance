'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Landmark,
  PiggyBank
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  amount: number;
  date: string;
  type: 'bill' | 'subscription' | 'loan' | 'income' | 'savings_deadline';
  category?: string;
  account?: string;
  status: 'upcoming' | 'paid' | 'expected';
}

export const FinancialCalendarView: React.FC = () => {
  const { familyId, formatCurrency } = useApp();
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date('2026-10-01T12:00:00Z'));
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?familyId=${familyId}&month=${monthStr}`);
      const json = await res.json();
      if (json.success) setEvents(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [familyId, monthStr]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthTitle = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Month grid calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(i);
  }

  const getEventsForDay = (day: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.date === dStr);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            Financial Calendar & Schedules
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Timeline of upcoming loan maturities, subscription renewals, bills, and expected salaries
          </p>
        </div>

        {/* View Switcher & Month Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setViewMode('month')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                viewMode === 'month'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                viewMode === 'agenda'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Agenda List
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            <button onClick={prevMonth} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[110px] text-center">
              {monthTitle}
            </span>
            <button onClick={nextMonth} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Month Calendar Grid View */}
      {viewMode === 'month' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-slate-100 pb-3 text-center text-xs font-bold uppercase text-slate-400 dark:border-slate-800">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Month Day Cells */}
          <div className="grid grid-cols-7 gap-1.5 pt-2">
            {daysArray.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-28 rounded-2xl bg-slate-50/40 dark:bg-slate-900/40" />;
              }

              const dayEvents = getEventsForDay(day);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === month &&
                new Date().getFullYear() === year;

              return (
                <div
                  key={`day-${day}`}
                  className={`h-28 rounded-2xl border p-2 flex flex-col justify-between transition-colors ${
                    isToday
                      ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20'
                      : 'border-slate-100 bg-white hover:bg-slate-50/50 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isToday ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-semibold text-slate-400">
                        {dayEvents.length} due
                      </span>
                    )}
                  </div>

                  {/* Day Events Stack */}
                  <div className="space-y-1 overflow-y-auto max-h-16 pr-0.5">
                    {dayEvents.map((ev) => {
                      const isIncome = ev.type === 'income';
                      return (
                        <div
                          key={ev.id}
                          className={`rounded-lg px-1.5 py-0.5 text-[9px] font-semibold truncate flex items-center justify-between ${
                            isIncome
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : ev.type === 'loan'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                          }`}
                        >
                          <span className="truncate">{ev.title}</span>
                          <span>{formatCurrency(ev.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Agenda List View */}
      {viewMode === 'agenda' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-4">
            Chronological Agenda for {monthTitle} ({events.length} Events)
          </h2>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {events.map((ev) => {
              const isIncome = ev.type === 'income';
              let Icon = Clock;
              if (ev.type === 'subscription') Icon = CreditCard;
              else if (ev.type === 'loan') Icon = Landmark;
              else if (ev.type === 'savings_deadline') Icon = PiggyBank;

              return (
                <div key={ev.id} className="py-3.5 flex items-center justify-between first:pt-0">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                        isIncome
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : ev.type === 'loan'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{ev.title}</h4>
                      <p className="text-[11px] text-slate-400">
                        Date: {ev.date} {ev.account ? `• Account: ${ev.account}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-sm font-bold ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                      {isIncome ? '+' : '-'}{formatCurrency(ev.amount)}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase capitalize">{ev.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
