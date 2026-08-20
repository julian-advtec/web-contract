// src/app/core/services/pagination.service.ts
import { Injectable } from '@angular/core';

export interface PaginationResult<T> {
  items: T[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  pages: number[];
}

@Injectable({
  providedIn: 'root'
})
export class PaginationService {
  paginate<T>(items: T[], page: number, pageSize: number): PaginationResult<T> {
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, totalItems);

    return {
      items: items.slice(start, end),
      totalItems,
      currentPage,
      pageSize,
      totalPages,
      pages: this.getPageRange(totalPages, currentPage)
    };
  }

  getPageRange(totalPages: number, currentPage: number, maxVisible: number = 5): number[] {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: number[] = [];
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push(-1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(-1);
      pages.push(totalPages);
    }

    return pages;
  }

  validatePage(page: number, totalPages: number): number {
    return Math.max(1, Math.min(page, totalPages || 1));
  }
}