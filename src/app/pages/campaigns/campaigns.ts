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

  // Search and Filter fields
  searchName: string = '';
  searchCity: string = '';
  sortOrder: 'asc' | 'desc' = 'asc'; // asc: most funds required first, desc: least funds required first

  // Category Tabs (shown as a pill navbar below the search bars)
  categories: string[] = [
    'Masjid Construction',
    'Medical Aid',
    'Education',
    'Orphan Care',
    'Widow & Family Support',
    'Food & Ration Aid',
    'Water Wells',
    'Disaster Relief',
    'Qurbani / Udhiya',
    'Zakat & Sadaqah',
    'Islamic Da\'wah',
    'General / Other'
  ];
  categoryTabs: string[] = ['All', ...this.categories];
  selectedCategory: string = 'All';
  isCategoryDropdownOpen: boolean = false;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<any>('http://127.0.0.1:8000/api/campaigns').subscribe({
      next: (res) => {
        this.campaigns = res.campaigns || res;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load all campaigns', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Switches the active category tab and re-filters the campaigns grid
  selectCategory(cat: string): void {
    this.selectedCategory = cat;
    this.isCategoryDropdownOpen = false;
  }

  // Opens/closes the category filter dropdown panel
  toggleCategoryDropdown(): void {
    this.isCategoryDropdownOpen = !this.isCategoryDropdownOpen;
  }

  // Closes the category dropdown (used by the backdrop click-away overlay)
  closeCategoryDropdown(): void {
    this.isCategoryDropdownOpen = false;
  }

  // Smooth scroll method to jump directly to the active campaigns section
  scrollToCampaigns(): void {
    const element = document.getElementById('campaigns-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Getter that filters and sorts campaigns dynamically
  get filteredCampaigns(): any[] {
    let result = [...this.campaigns];

    // Filter by name (masjid / campaign title)
    if (this.searchName && this.searchName.trim() !== '') {
      const query = this.searchName.toLowerCase().trim();
      result = result.filter(c => {
        const title = (c.title || c.name || '').toLowerCase();
        return title.includes(query);
      });
    }

    // Filter by city location
    if (this.searchCity && this.searchCity.trim() !== '') {
      const cityQuery = this.searchCity.toLowerCase().trim();
      result = result.filter(c => {
        const location = (c.location || '').toLowerCase();
        return location.includes(cityQuery);
      });
    }

    // Filter by selected category tab (skip when "All" is active)
    if (this.selectedCategory && this.selectedCategory !== 'All') {
      const categoryQuery = this.selectedCategory.toLowerCase().trim();
      result = result.filter(c => {
        const category = (c.category || '').toLowerCase().trim();
        return category === categoryQuery;
      });
    }

    // Helper to calculate remaining or required funds for sorting
    const getRequiredFunds = (c: any) => {
      const goal = Number(c.goal || c.budget || 0);
      const raised = Number(c.raised || 0);
      return Math.max(0, goal - raised);
    };

    // Sort campaigns based on required funds
    result.sort((a, b) => {
      const fundsA = getRequiredFunds(a);
      const fundsB = getRequiredFunds(b);

      if (this.sortOrder === 'asc') {
        // Ascending: Most required funds appear on top
        return fundsB - fundsA;
      } else {
        // Descending: Least required funds appear on top
        return fundsA - fundsB;
      }
    });

    return result;
  }
}