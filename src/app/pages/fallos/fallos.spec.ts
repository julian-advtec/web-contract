import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fallos } from './fallos';

describe('Fallos', () => {
  let component: Fallos;
  let fixture: ComponentFixture<Fallos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fallos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fallos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
