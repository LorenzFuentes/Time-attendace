import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CalendarEvent {
  id: string;
  eventType: 'meeting' | 'activity';
  date: string;
  time: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private eventsApi = 'http://localhost:3000/events';

  constructor(private http: HttpClient) {}

  getEvents(): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(this.eventsApi);
  }

  getEventById(id: string): Observable<CalendarEvent> {
    return this.http.get<CalendarEvent>(`${this.eventsApi}/${id}`);
  }

  getEventsByDate(date: string): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(`${this.eventsApi}?date=${date}`);
  }

  getEventsByType(type: string): Observable<CalendarEvent[]> {
    return this.http.get<CalendarEvent[]>(`${this.eventsApi}?eventType=${type}`);
  }

  addEvent(data: CalendarEvent): Observable<CalendarEvent> {
    return this.http.post<CalendarEvent>(this.eventsApi, data);
  }
}