import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './campaigns.html',
  styleUrls: ['./campaigns.scss']
})
export class CampaignsComponent implements OnInit {
  campaigns: any[] = [];
  loading = true;
  searchName = '';
  searchCity = '';
  sortOrder: 'asc' | 'desc' = 'asc';
  categories: string[] = ['Masjid Construction', 'Medical Aid', 'Education', 'Orphan Care', 'Widow & Family Support', 'Food & Ration Aid', 'Water Wells', 'Disaster Relief', 'Qurbani / Udhiya', 'Zakat & Sadaqah', 'Islamic Da\'wah', 'General / Other'];
  categoryTabs: string[] = ['All', ...this.categories];
  selectedCategory = 'All';
  isCategoryDropdownOpen = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<any>('http://127.0.0.1:8000/api/campaigns').subscribe({
      next: res => this.done(res.campaigns || res),
      error: err => { console.error('Failed to load all campaigns', err); this.done(this.campaigns); }
    });
  }

  private done(campaigns: any[]): void {
    this.campaigns = campaigns;
    this.loading = false;
    this.cdr.detectChanges();
  }

  selectCategory(cat: string): void {
    this.selectedCategory = cat;
    this.isCategoryDropdownOpen = false;
  }

  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  closeCategoryDropdown(): void {
    this.isCategoryDropdownOpen = false;
  }

  scrollToCampaigns(): void {
    document.getElementById('campaigns-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  get filteredCampaigns(): any[] {
    const name = (this.searchName || '').toLowerCase().trim();
    const city = (this.searchCity || '').toLowerCase().trim();
    const cat = this.selectedCategory === 'All' ? '' : (this.selectedCategory || '').toLowerCase().trim();
    const required = (c: any) => Math.max(0, Number(c.goal || c.budget || 0) - Number(c.raised || 0));
    const dir = this.sortOrder === 'asc' ? -1 : 1;

    return this.campaigns
      .filter(c =>
        (c.title || c.name || '').toLowerCase().includes(name) &&
        (c.location || '').toLowerCase().includes(city) &&
        (!cat || (c.category || '').toLowerCase().trim() === cat))
      .sort((a, b) => dir * (required(a) - required(b)));
  }
}