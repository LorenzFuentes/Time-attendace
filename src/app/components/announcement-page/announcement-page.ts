import { Component, OnInit } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { AnnouncementService, Announcement } from '../../service/announcement-service/announcement';
import { EventService, CalendarEvent } from '../../service/event-service/event';

@Component({
  selector: 'app-announcement-page',
  imports: [
    NzIconModule, 
    CommonModule, 
    FormsModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzDatePickerModule
  ],
  templateUrl: './announcement-page.html',
  styleUrls: ['../../app.scss']
})
export class AnnouncementPage implements OnInit {
  
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

  // New Announcement Model
  newAnnouncement: Partial<Announcement> = {
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0]
  };

  isModalVisible = false;
  isSubmitting = false;

  constructor(
    private announcementService: AnnouncementService,
    private eventService: EventService,
    private modalService: NzModalService
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
        announcementDate.setHours(0, 0, 0, 0);
        const todayMidnight = new Date(this.today);
        todayMidnight.setHours(0, 0, 0, 0);
        
        return announcementDate >= todayMidnight;
      });
      
      // Sort announcements by date (ascending) - closest dates first
      const sortedAnnouncements = futureAnnouncements.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB; // Ascending order (closest first)
      });
      
      // Show first 3 of upcoming announcements (closest dates)
      this.filteredAnnouncements = sortedAnnouncements.slice(0, 3);
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

  // ========== ADD ANNOUNCEMENT MODAL ==========
  showAddAnnouncementModal() {
    // Reset form
    this.newAnnouncement = {
      title: '',
      content: '',
      date: new Date().toISOString().split('T')[0]
    };
    
    this.isModalVisible = true;
  }

  handleCancel() {
    this.isModalVisible = false;
  }

  generateNewId(): string {
    if (this.announcements.length === 0) {
      return '1';
    }
    
    // Extract numeric IDs and find the max
    const numericIds = this.announcements
      .map(a => parseInt(a.id, 10))
      .filter(id => !isNaN(id));
    
    if (numericIds.length === 0) {
      return '1';
    }
    
    const maxId = Math.max(...numericIds);
    return (maxId + 1).toString();
  }

  submitAnnouncement() {
  // Validate form
  if (!this.newAnnouncement.title || !this.newAnnouncement.content || !this.newAnnouncement.date) {
    return;
  }

  this.isSubmitting = true;

  // Generate new ID
  const newId = this.generateNewId();
  
  // Format date to YYYY-MM-DD only
  let formattedDate: string;
  const dateValue = this.newAnnouncement.date;
  
  // Format the date to YYYY-MM-DD only
  if (typeof dateValue === 'string') {
    // If it's a string with time component, extract just the date part
    if (dateValue.includes('T')) {
      formattedDate = dateValue.split('T')[0];
    } else {
      formattedDate = dateValue;
    }
  } else {
    // Fallback to today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    formattedDate = `${year}-${month}-${day}`;
  }
  
  const announcementToAdd: Announcement = {
    id: newId,
    title: this.newAnnouncement.title,
    content: this.newAnnouncement.content,
    date: formattedDate // Now it's just YYYY-MM-DD
  };

  console.log('Sending announcement:', announcementToAdd); // Debug log

  this.announcementService.addEvent(announcementToAdd).subscribe({
    next: (response) => {
      console.log('Announcement added successfully:', response);
      this.isSubmitting = false;
      this.isModalVisible = false;
      
      // Reload announcements to get updated list
      this.loadAnnouncements();
    },
    error: (error) => {
      console.error('Error adding announcement:', error);
      this.isSubmitting = false;
    }
  });
}

  addAnnouncement() {
    this.showAddAnnouncementModal();
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
    
    if (futureCount === 0) {
      return `No upcoming events for ${this.currentMonthName}`;
    } else if (futureCount <= 3) {
      return `Showing all ${futureCount} upcoming events for ${this.currentMonthName}`;
    } else {
      return `Showing first 3 of ${futureCount} upcoming events for ${this.currentMonthName}`;
    }
  }

  disabledDate = (current: Date): boolean => {
    // Can't select days before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    current.setHours(0, 0, 0, 0);
    return current < today;
  } 
}