import { Component, OnInit } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CommonModule } from '@angular/common';
import { AnnouncementService, Announcement } from '../../service/announcement-service/announcement';
import { EventService, CalendarEvent } from '../../service/event-service/event';

@Component({
  selector: 'app-announcement-user',
  imports: [NzIconModule, CommonModule],
  templateUrl: './announcement-user.html',
  styleUrls: ['../../app.scss']
})
export class AnnouncementUser implements OnInit {
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth();
  currentMonthName = new Date().toLocaleString('default', { month: 'long' });
  today = new Date();
  todayString = this.today.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Announcements
  announcements: Announcement[] = [];
  filteredAnnouncements: Announcement[] = [];
  
  // Events
  events: CalendarEvent[] = [];
  filteredEvents: CalendarEvent[] = [];
  
  loading = {
    announcements: false,
    events: false
  };

  constructor(
    private announcementService: AnnouncementService,
    private eventService: EventService
  ) {}

  ngOnInit() {
    this.loadAnnouncements();
    this.loadEvents();
  }

  // ========== ANNOUNCEMENTS ==========
  loadAnnouncements() {
    this.loading.announcements = true;
    this.announcementService.getAnnouncements().subscribe({
      next: (data) => {
        this.announcements = data;
        this.filterAndLimitAnnouncements();
        this.loading.announcements = false;
      },
      error: (error) => {
        console.error('Error loading announcements:', error);
        this.loading.announcements = false;
      }
    });
  }

  filterAndLimitAnnouncements() {
    // Filter announcements by current month AND future/today dates
    const currentMonthAnnouncements = this.getCurrentMonthAnnouncements();
    
    // Filter out past announcements (date < today)
    const futureAnnouncements = currentMonthAnnouncements.filter(announcement => {
      if (!announcement.date) return false;
      const announcementDate = new Date(announcement.date);
      // Set time to midnight for accurate date comparison
      announcementDate.setHours(0, 0, 0, 0);
      const todayMidnight = new Date(this.today);
      todayMidnight.setHours(0, 0, 0, 0);
      
      return announcementDate >= todayMidnight;
    });
    
    // Show first 3 of future announcements
    this.filteredAnnouncements = futureAnnouncements.slice(0, 3);
  }

  getCurrentMonthAnnouncements(): Announcement[] {
    return this.announcements.filter(announcement => {
      if (!announcement.date) return false;
      const announcementDate = new Date(announcement.date);
      return announcementDate.getMonth() === this.currentMonth;
    });
  }

  getCurrentMonthAnnouncementsCount(): number {
    return this.getCurrentMonthAnnouncements().length;
  }

  getFutureAnnouncementsCount(): number {
    const currentMonthAnnouncements = this.getCurrentMonthAnnouncements();
    return currentMonthAnnouncements.filter(announcement => {
      if (!announcement.date) return false;
      const announcementDate = new Date(announcement.date);
      announcementDate.setHours(0, 0, 0, 0);
      const todayMidnight = new Date(this.today);
      todayMidnight.setHours(0, 0, 0, 0);
      
      return announcementDate >= todayMidnight;
    }).length;
  }

  addAnnouncement() {
    console.log('Add new announcement clicked');
    // Implement your logic to add a new announcement
  }

  // ========== EVENTS ==========
  loadEvents() {
    this.loading.events = true;
    this.eventService.getEvents().subscribe({
      next: (data) => {
        this.events = data;
        this.filterAndLimitEvents();
        this.loading.events = false;
      },
      error: (error) => {
        console.error('Error loading events:', error);
        this.loading.events = false;
      }
    });
  }

  filterAndLimitEvents() {
    // Filter events by current month AND future/today dates
    const currentMonthEvents = this.getCurrentMonthEvents();
    
    // Filter out past events (date < today)
    const futureEvents = currentMonthEvents.filter(event => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      // Set time to midnight for accurate date comparison
      eventDate.setHours(0, 0, 0, 0);
      const todayMidnight = new Date(this.today);
      todayMidnight.setHours(0, 0, 0, 0);
      
      return eventDate >= todayMidnight;
    });
    
    // Sort events by date (ascending) - closest first
    const sortedEvents = futureEvents.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    // Show first 3 of future events
    this.filteredEvents = sortedEvents.slice(0, 3);
  }

  getCurrentMonthEvents(): CalendarEvent[] {
    return this.events.filter(event => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === this.currentMonth;
    });
  }

  getCurrentMonthEventsCount(): number {
    return this.getCurrentMonthEvents().length;
  }

  getFutureEventsCount(): number {
    const currentMonthEvents = this.getCurrentMonthEvents();
    return currentMonthEvents.filter(event => {
      if (!event.date) return false;
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      const todayMidnight = new Date(this.today);
      todayMidnight.setHours(0, 0, 0, 0);
      
      return eventDate >= todayMidnight;
    }).length;
  }

  addEvent() {
    console.log('Add new event clicked');
    // Implement your logic to add a new event
  }

  // ========== UTILITIES ==========
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).toUpperCase();
  }

  formatEventDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    }).toUpperCase();
  }

  getEventTypeLabel(type: 'meeting' | 'activity'): string {
    return type === 'meeting' ? 'Meeting' : 'Activity';
  }

  getEventTypeClass(type: 'meeting' | 'activity'): string {
    return type === 'meeting' ? 'event-type-meeting' : 'event-type-activity';
  }

  isPastDate(dateString: string): boolean {
    if (!dateString) return false;
    const checkDate = new Date(dateString);
    checkDate.setHours(0, 0, 0, 0);
    const todayMidnight = new Date(this.today);
    todayMidnight.setHours(0, 0, 0, 0);
    
    return checkDate < todayMidnight;
  }

  getAnnouncementMonthLabel(): string {
    const futureCount = this.getFutureAnnouncementsCount();
    const totalCount = this.getCurrentMonthAnnouncementsCount();
    
    if (futureCount === 0) {
      return `No upcoming announcements for ${this.currentMonthName}`;
    } else if (futureCount <= 3) {
      return `Showing all ${futureCount} upcoming announcements for ${this.currentMonthName}`;
    } else {
      return `Showing first 3 of ${futureCount} upcoming announcements for ${this.currentMonthName}`;
    }
  }

  getEventMonthLabel(): string {
    const futureCount = this.getFutureEventsCount();
    const totalCount = this.getCurrentMonthEventsCount();
    
    if (futureCount === 0) {
      return `No upcoming events for ${this.currentMonthName}`;
    } else if (futureCount <= 3) {
      return `Showing all ${futureCount} upcoming events for ${this.currentMonthName}`;
    } else {
      return `Showing first 3 of ${futureCount} upcoming events for ${this.currentMonthName}`;
    }
  }
}