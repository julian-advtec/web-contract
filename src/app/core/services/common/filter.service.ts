// src/app/core/services/filter.service.ts
import { Injectable } from '@angular/core';

export interface FilterConfig<T> {
  searchTerm: string;
  searchFields: (keyof T)[];
  filters: Record<string, any>;
  sortField?: keyof T;
  sortDirection?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class FilterService {
  filterItems<T>(items: T[], config: FilterConfig<T>): T[] {
    let result = [...items];

    if (config.searchTerm?.trim()) {
      const term = config.searchTerm.toLowerCase().trim();
      result = result.filter(item =>
        config.searchFields.some(field => {
          const value = this.getValue(item, field);
          return value && String(value).toLowerCase().includes(term);
        })
      );
    }

    Object.entries(config.filters || {}).forEach(([key, value]) => {
      if (value && value !== 'TODOS' && value !== '') {
        result = result.filter(item => {
          const itemValue = this.getValue(item, key as keyof T);
          return itemValue === value;
        });
      }
    });

    if (config.sortField) {
      result.sort((a, b) => {
        const aVal = this.getValue(a, config.sortField!);
        const bVal = this.getValue(b, config.sortField!);
        if (aVal === bVal) return 0;
        const comparison = aVal < bVal ? -1 : 1;
        return config.sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }

  private getValue<T, K extends keyof T>(item: T, key: K): any {
    const value = item[key];
    if (value === null || value === undefined) return '';
    return value;
  }

  createSearchFilter<T>(searchTerm: string, fields: (keyof T)[]): (item: T) => boolean {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return () => true;

    return (item: T) =>
      fields.some(field => {
        const value = this.getValue(item, field);
        return String(value).toLowerCase().includes(term);
      });
  }
}