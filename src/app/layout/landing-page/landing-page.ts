import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  imports: [],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {
  constructor(private router: Router){}

  getLogin() {
    console.log('Primary button clicked');
    this.router.navigate(['login']); 
  }

  getRegister() {
    console.log('Secondary button clicked');
    this.router.navigate(['register']);
  }
}
