import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, tap } from 'rxjs/operators';
import { Observable, BehaviorSubject  } from 'rxjs';
import { User, Admin } from '../model/post';
import { inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private adminApi = 'http://localhost:3000/admin';
  private userApi = 'http://localhost:3000/users';
   private msg = inject(NzMessageService);
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private userType: 'admin' | 'user' | null = null;

  constructor(private http: HttpClient) {
    this.loadStoreUser();
  }

  private loadStoreUser(): void {
  const storedUser = localStorage.getItem('currentUser');
  const storedUserType = localStorage.getItem('currentUserType');
  
  if (storedUser && storedUserType) {
    const user = JSON.parse(storedUser);
    this.userType = storedUserType as 'admin' | 'user';

    if (!user.role) {
      user.role = this.userType;
    }
    
    this.currentUserSubject.next(user);
  }
}

  private setCurrentUser(user: any): void {
  if (!user.role) {
    user.role = this.userType;
  }
  localStorage.setItem('currentUser', JSON.stringify(user));
  localStorage.setItem('currentUserType', this.userType || '');
  this.currentUserSubject.next(user);
}

  // LOGIN
  login(username: string, password: string): Observable<any> {
   return new Observable(observer => {
    this.http.get<Admin[]>(`${this.adminApi}?username=${username}&password=${password}`)
      .subscribe({
        next: (admins) => {
          if (admins.length > 0) {
            const admin = admins[0];
            admin.access = 'admin';      
            this.userType = 'admin';
            this.setCurrentUser(admin);
            observer.next(admin);
            observer.complete();
          } else {
            observer.error({
              status: 401,
              message: 'Invalid username or password'
            });
          }
        },
        error: (err) => {
          observer.error(err);        }
      });
  });
}

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  getCurrentUserRole(): string {
    const user = this.getCurrentUser();
    return user?.role || '';
  }
  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUserType');
    this.currentUserSubject.next(null);
    this.userType = null;
  }

  getUserProfile(): Observable<any> {
    const user = this.getCurrentUser();
    if (!user || !user.id) {
      throw new Error('No user logged in');
    }

    if (this.userType === 'admin') {
      return this.http.get<Admin>(`${this.adminApi}/${user.id}`);
    } else {
      return this.http.get<User>(`${this.userApi}/${user.id}`);
    }
  }

  updateProfile(updatedData: any): Observable<any> {
    const user = this.getCurrentUser();
    if (!user || !user.id) {
      throw new Error('No user logged in');
    }

    const apiUrl = this.userType === 'admin' 
      ? `${this.adminApi}/${user.id}`
      : `${this.userApi}/${user.id}`;

    return this.http.put(apiUrl, updatedData).pipe(
      tap(updatedUser => {
        const mergedUser = {
          ...user,
          ...updatedUser,
          role: user.role
        };
        this.setCurrentUser(mergedUser);
      })
    );
  }

  refreshUserData(): Observable<any> {
    const user = this.getCurrentUser();
    if (!user || !user.id) {
      throw new Error('No user logged in');
    }

    const apiUrl = this.userType === 'admin'
      ? `${this.adminApi}/${user.id}`
      : `${this.userApi}/${user.id}`;

    return this.http.get(apiUrl).pipe(
      tap(freshUser => {
        const mergedUser = {
          ...freshUser,
          role: user.role
        };
        this.setCurrentUser(mergedUser);
      })
    );
  }

  register(registerData: any): Observable<User> {
    return this.http.post<User>(this.userApi, registerData);
  }
  
  getAllRegisteredUsers(): Observable<User[]> {
    return this.http.get<User[]>(this.userApi);
  }
  
  // ADMIN
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

  // DASHBOARD
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

  // Employee
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