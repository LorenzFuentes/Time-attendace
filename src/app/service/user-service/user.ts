import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { User } from '../../model/post';

@Injectable({ providedIn: 'root' })
export class UserService {
  private userApi = 'http://localhost:3000/users';

  constructor(private http: HttpClient) {}

  // Employee Management
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.userApi);
  }

  getUserById(id: any): Observable<User> {
    return this.http.get<User>(`${this.userApi}/${id}`);
  }

  createUser(user: User): Observable<User> {
    return this.http.post<User>(this.userApi, user);
  }

  updateUser(id: any, user: User): Observable<User> {
    return this.http.put<User>(`${this.userApi}/${id}`, user);
  }

  deleteUser(id: any): Observable<void> {
    return this.http.delete<void>(`${this.userApi}/${id}`);
  }

  // Dashboard Stats
  getUserCount(): Observable<number> {
    return this.http.get<User[]>(this.userApi).pipe(
      map(users => users.length)
    );
  }

  // Registration
  register(registerData: any): Observable<User> {
    return this.http.post<User>(this.userApi, registerData);
  }
}