export interface User {
  id: number;
  firstName: string;
  middleName: string;
  lastName: string;
  contact: string;
  department: string;
  position: string;
  username: string;
  email: string;
  password: string;
}


export interface Admin {
    id: any;
    username: any;
    password: any;
    email: any;
    fullname: string;
    access: string;
}

export interface RegisterRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  contact: string;
  department: string;
  position: string;
  username: string;
  email: string;
  password: string;
}