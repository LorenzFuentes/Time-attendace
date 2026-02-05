import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private attendanceApi = 'http://localhost:3000/attendance';

  constructor(private http: HttpClient) {}

  // Get all attendance records
  getAttendance(): Observable<any[]> {
    return this.http.get<any[]>(this.attendanceApi);
  }

  // Get attendance by employee ID
  getAttendanceByEmployeeId(employeeId: any): Observable<any[]> {
    return this.http.get<any[]>(`${this.attendanceApi}?employeeId=${employeeId}`);
  }

  // Add new attendance record
  addAttendance(data: any): Observable<any> {
    return this.http.post(this.attendanceApi, data);
  }

  // Update attendance record
  updateAttendance(id: number, data: any): Observable<any> {
    return this.http.put(`${this.attendanceApi}/${id}`, data);
  }

  // Delete attendance record
  deleteAttendance(id: number): Observable<any> {
    return this.http.delete(`${this.attendanceApi}/${id}`);
  }
}