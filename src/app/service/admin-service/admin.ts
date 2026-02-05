import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Admin } from '../../model/post';
import { map, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private adminApi = 'http://localhost:3000/admin';

  constructor(private http: HttpClient) {}

  // Admin User Management
  getAllAdmins(): Observable<Admin[]> {
    return this.http.get<Admin[]>(this.adminApi);
  }

  getAdminById(id: any): Observable<Admin> {
    return this.http.get<Admin>(`${this.adminApi}/${id}`);
  }

  createAdmin(admin: Admin): Observable<Admin> {
    return this.http.post<Admin>(this.adminApi, admin);
  }

  updateAdmin(id: any, admin: Admin): Observable<Admin> {
    return this.http.put<Admin>(`${this.adminApi}/${id}`, admin);
  }

  deleteAdmin(id: any): Observable<void> {
    return this.http.delete<void>(`${this.adminApi}/${id}`);
  }

  // Dashboard Stats
  getAdminCount(): Observable<number> {
    return this.http.get<Admin[]>(this.adminApi).pipe(
      map(admins => admins.length)
    );
  }
}