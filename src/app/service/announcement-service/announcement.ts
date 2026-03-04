import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
}

@Injectable({
  providedIn: 'root',
})
export class AnnouncementService {
  private announcementApi = 'http://localhost:3000/announcement';

  constructor(private http: HttpClient) { }

  getAnnouncements(): Observable<Announcement[]> {
     return this.http.get<Announcement[]>(this.announcementApi);
  }

  getEventById(id: string): Observable<Announcement> {
    return this.http.get<Announcement>(`${this.announcementApi}/${id}`);
  }

  getEventsByDate(date: string): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${this.announcementApi}?date=${date}`);
  }

  getEventsByType(type: string): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${this.announcementApi}?eventType=${type}`);
  }

  addEvent(data: Announcement): Observable<Announcement> {
    return this.http.post<Announcement>(this.announcementApi, data);
  }
}
