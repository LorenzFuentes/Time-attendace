import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private leaveApi = 'http://localhost:3000/leave';

  constructor(private http: HttpClient) {}

  // Get all leave records
  getLeaveRecords(): Observable<any[]> {
    return this.http.get<any[]>(this.leaveApi);
  }

  // Get leave records by employee ID
  getLeaveByEmployeeId(employeeId: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.leaveApi}?employeeId=${employeeId}`);
  }

  // Add new leave record
  addLeaveRecord(data: any): Observable<any> {
    return this.http.post(this.leaveApi, data);
  }

  // Update leave record
  updateLeaveRecord(id: string, data: any): Observable<any> {
    return this.http.put(`${this.leaveApi}/${id}`, data);
  }

  // Delete leave record
  deleteLeaveRecord(id: string): Observable<any> {
    return this.http.delete(`${this.leaveApi}/${id}`);
  }
}