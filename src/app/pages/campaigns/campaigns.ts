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

  // ---- Mobile-only collapsible UI state ----
  isFiltersOpen = false;
  private openInfoCards = new Set<number>();

  infoCards = [
    { icon: '🔍', iconCls: 'bg-[#F2DFC4] dark:bg-[#332715] text-[#B5601F] dark:text-[#DF8642]', tick: 'text-[#B5601F] dark:text-[#DF8642]', title: 'How We Verify Campaigns', desc: 'Trust and absolute transparency are our core values. We do not list campaigns blindly.', items: ['Our team goes directly to the ground to inspect the physical site.', 'We verify financial requirements, estimates, and immediate needs with local committees.', 'Every single project is vetted before going live to protect donor contributions.'] },
    { icon: '📈', iconCls: 'bg-[#E4E6D6] dark:bg-[#25261C] text-[#5B6048] dark:text-[#DBDCD6]', tick: 'text-[#5B6048] dark:text-[#DBDCD6]', title: 'Live Progress Tracking', desc: 'You can always see how a project is evolving from start to completion.', items: ['Click on any campaign card to open its dedicated donation and progress page.', 'View real-time funding meters, percentage metrics, and milestones.', 'Our volunteers update progress ASAP via photo logs from the field.'] },
    { icon: '💳', iconCls: 'bg-[#E9D3BE] dark:bg-[#392B1E] text-[#6B380F] dark:text-[#E0751F]', tick: 'text-[#6B380F] dark:text-[#E0751F]', num: true, title: 'Simple Steps to Donate', desc: 'Contributing to noble causes has never been easier or more secure.', items: ['Open any campaign page by clicking its card above.', 'Pay securely through Razorpay using UPI, card, netbanking, or wallet.', 'Receive an instant digital donation receipt and watch project milestones unfold.'] }
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.http.get<any>('/api/campaigns').subscribe({
      next: res => this.done(res.campaigns || res),
      error: err => { console.error('Failed to load all campaigns', err); this.done(this.campaigns); }
    });
  }

  private done(campaigns: any[]): void {
    this.campaigns = campaigns;
    this.loading = false;
    this.cdr.detectChanges();
  }

  toggleFilters(): void {
    this.isFiltersOpen = !this.isFiltersOpen;
  }

  // true when any search/category filter is applied (used to flag the collapsed panel on mobile)
  get hasActiveFilters(): boolean {
    return !!(this.searchName || '').trim() || !!(this.searchCity || '').trim() || this.selectedCategory !== 'All';
  }

  toggleInfoCard(i: number): void {
    if (this.openInfoCards.has(i)) this.openInfoCards.delete(i);
    else this.openInfoCards.add(i);
  }

  isInfoCardOpen(i: number): boolean {
    return this.openInfoCards.has(i);
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

    getPercent(camp: any): number {
    return Math.min(100, ((Number(camp.raised) || 0) / (Number(camp.goal ?? camp.budget) || 1)) * 100);
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