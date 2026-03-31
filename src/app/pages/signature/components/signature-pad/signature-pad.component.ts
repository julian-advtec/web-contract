// pages/signature/components/signature-pad/signature-pad.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SignatureService } from '../../../../core/services/signature.service';
import { UserRole } from '../../../../core/models/user.types';

@Component({
  selector: 'app-signature-pad',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './signature-pad.component.html',
  styleUrls: ['./signature-pad.component.scss']
})
export class SignaturePadComponent {
  @Input() currentUserRole: string = '';
  @Input() tieneFirma: boolean = false;
  
  constructor(public signatureService: SignatureService) {}
}