import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { User, Admin, RegisterRequest } from '../model/post';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private adminApi = 'http://localhost:3000/admin';
  private userApi = 'http://localhost:3000/users';

  constructor(private http: HttpClient) {}

  // LOGIN - Check if user exists with matching username and password
  login(username: string, password: string): Observable<boolean> {
    return this.http
      .get<Admin[]>(`${this.adminApi}?username=${username}&password=${password}`)
      .pipe(map(users => users.length > 0));
  }

  // --- USER REGISTRATION ---
  // Register new user to json-server API
  register(registerData: RegisterRequest): Observable<User> {
    return this.http.post<User>(this.userApi, registerData);
  }
  
  // Get all registered users
  getAllRegisteredUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.userApi);
  }
  
  // --- ADMIN USERS ---
  getAllUsers(): Observable<Admin[]> {
    return this.http.get<Admin[]>(this.adminApi);
  }

  getUserById(id: any): Observable<Admin> {
    return this.http.get<Admin>(`${this.adminApi}/${id}`);
  }

  createUser(admin: Admin): Observable<Admin> {
    return this.http.post<Admin>(this.adminApi, admin);
  }

  updateUser(id: any, admin: Admin): Observable<Admin> {
    return this.http.put<Admin>(`${this.adminApi}/${id}`, admin);
  }

  deleteUser(id: any): Observable<void> {
    return this.http.delete<void>(`${this.adminApi}/${id}`);
  }

  // --- DASHBOARD STATISTICS METHODS ---
  
  // Get admin count
  getAdminCount(): Observable<number> {
    return this.http.get<Admin[]>(this.adminApi).pipe(
      map(admins => admins.length)
    );
  }

  // Get employee count (assuming employees are regular users)
  getEmployeeCount(): Observable<number> {
    return this.http.get<User[]>(this.userApi).pipe(
      map(users => users.length)
    );
  }
}