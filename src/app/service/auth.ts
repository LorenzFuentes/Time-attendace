import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { User, Admin } from '../model/post';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private adminApi = 'http://localhost:3000/admin';
  private userApi = 'http://localhost:3000/users';

  constructor(private http: HttpClient) {}

  // LOGIN
  login(username: string, password: string): Observable<boolean> {
    return this.http
      .get<Admin[]>(`${this.adminApi}?username=${username}&password=${password}`)
      .pipe(map(users => users.length > 0));
  }

  //USER REGISTRATION
  register(registerData: any): Observable<User> {
    return this.http.post<User>(this.userApi, registerData);
  }
  
  getAllRegisteredUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.userApi);
  }
  
  //ADMIN
  getAllUsers(): Observable<Admin[]> {
    return this.http.get<Admin[]>(this.adminApi);
  }

  getUserById(id: any): Observable<Admin> {
    return this.http.get<Admin>(`${this.adminApi}/${id}`);
  }

  createUser(admin: any): Observable<Admin> {
    return this.http.post<Admin>(this.adminApi, admin);
  }

  updateUser(id: any, admin: any): Observable<Admin> {
    return this.http.put<Admin>(`${this.adminApi}/${id}`, admin);
  }

  deleteUser(id: any): Observable<void> {
    return this.http.delete<void>(`${this.adminApi}/${id}`);
  }

  //DASHBOARD
  getAdminCount(): Observable<number> {
    return this.http.get<Admin[]>(this.adminApi).pipe(
      map(admins => admins.length)
    );
  }

  getEmployeeCount(): Observable<number> {
    return this.http.get<User[]>(this.userApi).pipe(
      map(users => users.length)
    );
  }

  //Employee
  getAllEmployee(): Observable<User[]> {
    return this.http.get<User[]>(this.userApi);
  }

  getEmployeeById(id: any): Observable<User> {
    return this.http.get<User>(`${this.userApi}/${id}`);
  }

  createEmployee(admin: any): Observable<User> {
    return this.http.post<User>(this.userApi, admin);
  }

  updateEmployee(id: any, admin: any): Observable<User> {
    return this.http.put<User>(`${this.userApi}/${id}`, admin);
  }

  deleteEmployee(id: any): Observable<void> {
    return this.http.delete<void>(`${this.userApi}/${id}`);
  }
}