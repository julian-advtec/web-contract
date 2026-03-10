import { Pipe, PipeTransform } from '@angular/core';
import { Contrato } from '../../../../core/models/juridica.model';

@Pipe({
  name: 'filterCriticos',
  standalone: true
})
export class FilterCriticosPipe implements PipeTransform {
  transform(contratos: Contrato[]): Contrato[] {
    if (!contratos) return [];
    
    const hoy = new Date();
    return contratos.filter(c => {
      if (!c.fechaTerminacion) return false;
      const fin = new Date(c.fechaTerminacion);
      const dias = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      return dias < 30;
    });
  }
}