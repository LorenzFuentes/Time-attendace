import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { User, Admin } from '../model/post';
import { map, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private adminApi = 'http://localhost:3000/admin';
  private userApi = 'http://localhost:3000/users';
  
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
        this.checkAdminLogin(username, password).subscribe({
          next: (adminData) => {
            // Admin login successful
            const response = {
              ...adminData,
              userType: 'admin'
            };
            observer.next(response);
            observer.complete();
          },
          error: (adminError) => {
            // try user login
            this.checkUserLogin(username, password).subscribe({
              next: (userData) => {
                // User login successful
                const response = {
                  ...userData,
                  userType: 'user'
                };
                observer.next(response);
                observer.complete();
              },
              error: (userError) => {
                // Both failed
                observer.error({
                  status: 401,
                  message: 'Invalid username or password'
                });
              }
            });
          }
        });
      });
    }

  private checkAdminLogin(username: string, password: string): Observable<any> {
    return new Observable(observer => {
      this.http.get<any[]>(`${this.adminApi}?username=${username}&password=${password}`).subscribe({
        next: (admins) => {
          if (admins.length > 0) {
            const admin = admins[0];
            admin.access = 'admin';
            this.userType = 'admin';
            this.setCurrentUser(admin);
            observer.next(admin);
            observer.complete();
          } else {
            observer.error('Not an admin');
          }
        },
        error: (err) => observer.error(err)
      });
    });
  }

  private checkUserLogin(username: string, password: string): Observable<any> {
    return new Observable(observer => {
      this.http.get<any[]>(`${this.userApi}?username=${username}&password=${password}`).subscribe({
        next: (users) => {
          if (users.length > 0) {
            const user = users[0];
            user.access = 'user';
            this.userType = 'user';
            this.setCurrentUser(user);
            observer.next(user);
            observer.complete();
          } else {
            observer.error('Not a user');
          }
        },
        error: (err) => observer.error(err)
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

    const apiUrl = this.userType === 'admin' 
      ? `${this.adminApi}/${user.id}`
      : `${this.userApi}/${user.id}`;
    
    return this.http.get(apiUrl);
  }

  updateProfile(updatedData: any): Observable<any> {
    const user = this.getCurrentUser();
    if (!user || !user.id) {
      throw new Error('No user logged in');
    }

    const apiUrl = this.userType === 'admin' 
      ? `${this.adminApi}/${user.id}`
      : `${this.userApi}/${user.id}`;

    return this.http.put(apiUrl, updatedData);
  }
  getEmployeeCount(): Observable<number> {
  return this.http.get<User[]>(this.userApi).pipe(
    map(users => users.length)
  );
}
}