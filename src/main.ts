// src/main.ts
import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';  // ← ¡IMPORTAR appConfig!

bootstrapApplication(AppComponent, appConfig)  // ← ¡USAR appConfig!
  .catch(err => console.error(err));