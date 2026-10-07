import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';

const API = '/api';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.scss']
})
export class AdminDashboardComponent implements OnInit {
  activeTab: 'campaigns' | 'volunteers' = 'campaigns';
  mobileMenuOpen = false;
  showCreateCampaignForm = false;
  showCreateVolunteerForm = false;
  campaigns: any[] = [];
  pendingCampaigns: any[] = [];
  needsBankDetailsCampaigns: any[] = [];
  volunteers: any[] = [];
  pendingVolunteers: any[] = [];
  categories: string[] = [
    'Masjid Construction', 'Medical Aid', 'Education', 'Orphan Care', 'Widow & Family Support',
    'Food & Ration Aid', 'Water Wells', 'Disaster Relief', 'Qurbani / Udhiya', 'Zakat & Sadaqah',
    'Islamic Da\'wah', 'General / Other'
  ];
  newCampaign = this.emptyCampaign();
  selectedFile: File | null = null;
  selectedQrCodeFile: File | null = null;
  selectedAdditionalFiles: File[] = [];
  selectedDocumentProofs: File[] = [];
  creatingCampaign = false;
  newVolunteer = this.emptyVolunteer();
  creatingVolunteer = false;
  selectedCampaignModal: any = null;
  selectedVolunteerModal: any = null;
  campaignVolunteers: { [campaignId: string]: string[] } = {};
  imageModalUrl: string | null = null;
  imageModalTitle: string | null = null;
  campaignSearchQuery = '';
  campaignSortOrder: 'asc' | 'desc' = 'asc';
  volunteerSearchQuery = '';
  volunteerSortOrder: 'asc' | 'desc' = 'asc';
  private readonly bankKeys = ['bank_account_name', 'bank_account_number', 'bank_ifsc_code', 'bank_name', 'upi_id', 'upi_qr_code_url'];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private router: Router) {}

  private emptyCampaign() {
    return { title: '', location: '', description: '', goal: 0, category: '', information: '', end_date: '', bank_account_name: '', bank_account_number: '', bank_ifsc_code: '', bank_name: '', upi_id: '' };
  }

  private emptyVolunteer() {
    return { name: '', email: '', password: '', phone: '', city: '', bio: '', role: 'volunteer' };
  }

  private get allCamps(): any[] {
    return [...this.campaigns, ...this.pendingCampaigns, ...this.needsBankDetailsCampaigns];
  }

  private parseList(v: any): any[] {
    if (typeof v === 'string') {
      try { v = JSON.parse(v); } catch { v = []; }
    }
    return Array.isArray(v) ? v : [];
  }

  private form(key: string, files: any): FormData {
    const fd = new FormData();
    Array.from(files).forEach((f: any) => fd.append(key, f, f.name));
    return fd;
  }

  private act(obs: Observable<any>, ok?: string, fail?: string, after: (res?: any) => void = () => this.loadAdminData()): void {
    obs.subscribe({
      next: res => { if (ok) alert(ok); after(res); },
      error: err => { console.error(err); if (fail) alert(fail); }
    });
  }

  ngOnInit(): void {
    const p = localStorage.getItem('user_profile');
    if (!p) {
      alert('Please log in as an admin.');
      this.router.navigate(['/login']);
      return;
    }
    if (JSON.parse(p).role?.toLowerCase() !== 'admin') {
      alert('Access denied. Admins only.');
      this.router.navigate(['/']);
      return;
    }
    this.loadAdminData();
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/']);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  setActiveTab(tab: 'campaigns' | 'volunteers'): void {
    this.activeTab = tab;
    this.mobileMenuOpen = false;
  }

  loadAdminData(): void {
    this.http.get<any>(`${API}/admin/campaign-volunteers`).subscribe({
      next: r => {
        const m = r.assignments || r.campaign_volunteers || r.mappings || r;
        this.campaignVolunteers = {};
        if (Array.isArray(m)) m.forEach((x: any) => {
          if (x.campaign_id && x.volunteer_id) {
            const l = (this.campaignVolunteers[x.campaign_id] ||= []);
            if (!l.includes(x.volunteer_id)) l.push(x.volunteer_id);
          }
        });
        this.http.get<any>(`${API}/admin/campaigns`).subscribe({
          next: res => {
            const all = (res.campaigns || res).map((c: any) => ({
              ...c,
              additional_images: this.parseList(c.additional_images),
              document_proofs: this.parseList(c.document_proofs),
              raised_input: c.raised ?? 0,
              assigned_volunteers_count: (this.campaignVolunteers[c.id] || c.volunteer_ids || []).length,
              is_featured: !!c.is_featured,
              upi_qr_code_url: c.upi_qr_code_url || null
            }));
            const isPending = (c: any) => c.approval_status?.toLowerCase() === 'pending' || c.status?.toLowerCase() === 'pending';
            const isBank = (c: any) => c.status?.toLowerCase() === 'pending_bank_details';
            this.pendingCampaigns = all.filter(isPending);
            this.needsBankDetailsCampaigns = all.filter(isBank);
            this.campaigns = all.filter((c: any) => !isPending(c) && !isBank(c));
            if (this.selectedCampaignModal) {
              const u = this.allCamps.find(c => c.id === this.selectedCampaignModal.id);
              if (u) this.selectedCampaignModal = { ...u };
            }
            this.cdr.detectChanges();
          },
          error: err => console.error('Error fetching admin campaigns', err)
        });
      },
      error: err => console.error('Error fetching campaign-volunteer mappings', err)
    });
    this.http.get<any>(`${API}/admin/volunteers`).subscribe({
      next: res => {
        const all = (res.volunteers || res).map((v: any) => ({ ...v, name: v.name || v.full_name }));
        const isPending = (v: any) => v.approval_status?.toLowerCase() === 'pending';
        this.pendingVolunteers = all.filter(isPending);
        this.volunteers = all.filter((v: any) => !isPending(v));
        if (this.selectedVolunteerModal) {
          const u = this.volunteers.find(v => v.id === this.selectedVolunteerModal.id);
          if (u) this.selectedVolunteerModal = { ...u };
        }
        this.cdr.detectChanges();
      },
      error: err => console.error('Error fetching volunteers', err)
    });
  }

  openCampaignManageModal(campaign: any): void {
    this.selectedCampaignModal = { ...campaign, raised_input: campaign.raised ?? 0 };
  }

  closeCampaignManageModal(): void {
    this.selectedCampaignModal = null;
    this.loadAdminData();
  }

  openVolunteerManageModal(volunteer: any): void {
    this.selectedVolunteerModal = { ...volunteer, name: volunteer.name || volunteer.full_name };
  }

  closeVolunteerManageModal(): void {
    this.selectedVolunteerModal = null;
    this.loadAdminData();
  }

  calcPercentage(raised: number, goal: number): number {
    return !goal || goal <= 0 ? 0 : Math.min(((raised || 0) / goal) * 100, 100);
  }

  getCampaignAssignedVolunteers(campaignId: string): any[] {
    const ids = this.campaignVolunteers[campaignId] || [];
    return this.volunteers.filter(v => ids.includes(v.id));
  }

  getCampaignUnassignedVolunteers(campaignId: string): any[] {
    const ids = this.campaignVolunteers[campaignId] || [];
    return this.volunteers.filter(v => !ids.includes(v.id));
  }

  assignVolunteerToCampaignModal(campaignId: string, volunteerId: string): void {
    const l = (this.campaignVolunteers[campaignId] ||= []);
    if (!l.includes(volunteerId)) l.push(volunteerId);
  }

  unassignVolunteerFromCampaignModal(campaignId: string, volunteerId: string): void {
    if (this.campaignVolunteers[campaignId]) this.campaignVolunteers[campaignId] = this.campaignVolunteers[campaignId].filter(id => id !== volunteerId);
  }

  saveCampaignAssignments(campaignId: string): void {
    this.act(
      this.http.post(`${API}/admin/campaigns/${campaignId}/assign-volunteers`, { volunteer_ids: this.campaignVolunteers[campaignId] || [] }),
      'Volunteer assignments updated successfully!', 'Failed to update assignments.'
    );
  }

  getVolunteerAssignedCampaigns(volunteerId: string): any[] {
    const all = this.allCamps;
    return Object.keys(this.campaignVolunteers)
      .filter(id => this.campaignVolunteers[id]?.includes(volunteerId))
      .map(id => all.find(c => c.id === id))
      .filter(Boolean);
  }

  getVolunteerUnassignedCampaigns(volunteerId: string): any[] {
    const ids = this.getVolunteerAssignedCampaigns(volunteerId).map(c => c.id);
    return this.allCamps.filter(c => !ids.includes(c.id));
  }

  assignCampaignToVolunteerModal(volunteerId: string, campaignId: string): void {
    this.assignVolunteerToCampaignModal(campaignId, volunteerId);
  }

  unassignCampaignFromVolunteerModal(volunteerId: string, campaignId: string): void {
    this.unassignVolunteerFromCampaignModal(campaignId, volunteerId);
  }

  saveVolunteerAssignments(volunteerId: string): void {
    const all = this.allCamps;
    if (!all.length) {
      alert('No campaigns available to update.');
      return;
    }
    let done = 0, hasError = false;
    all.forEach(camp => {
      this.http.post(`${API}/admin/campaigns/${camp.id}/assign-volunteers`, { volunteer_ids: this.campaignVolunteers[camp.id] || [] }).subscribe({
        next: () => {
          if (++done === all.length && !hasError) {
            alert('Campaign assignments for volunteer updated successfully!');
            this.loadAdminData();
          }
        },
        error: err => {
          hasError = true;
          console.error(`Error updating assignments for campaign ${camp.id}`, err);
          if (++done === all.length) {
            alert('Failed to update some campaign assignments.');
            this.loadAdminData();
          }
        }
      });
    });
  }

  get featuredCampaignsCount(): number {
    return this.campaigns.filter(c => c.is_featured).length;
  }

  toggleFeaturedCampaign(camp: any, event?: any): void {
    const newState = event ? event.target.checked : !camp.is_featured;
    this.http.put(`${API}/admin/campaigns/${camp.id}`, { ...camp, is_featured: newState }).subscribe({
      next: () => {
        camp.is_featured = newState;
        if (this.selectedCampaignModal?.id === camp.id) this.selectedCampaignModal.is_featured = newState;
        alert(newState ? 'Campaign marked as featured successfully!' : 'Campaign removed from featured list.');
        this.loadAdminData();
      },
      error: err => {
        console.error('Error updating featured status', err);
        alert('Failed to update featured status.');
        if (event) event.target.checked = camp.is_featured;
      }
    });
  }

  get filteredCampaigns(): any[] {
    const q = this.campaignSearchQuery?.trim().toLowerCase();
    const rem = (c: any) => (c.goal || 0) - (c.raised || 0);
    let result = [...this.campaigns];
    if (q) result = result.filter(c => [c.title, c.location, c.description].some(f => (f || '').toLowerCase().includes(q)));
    return result.sort((a, b) => this.campaignSortOrder === 'asc' ? rem(b) - rem(a) : rem(a) - rem(b));
  }

  get filteredVolunteers(): any[] {
    const q = this.volunteerSearchQuery?.trim().toLowerCase();
    const nm = (v: any) => (v.name || v.full_name || '').toLowerCase();
    let result = [...this.volunteers];
    if (q) result = result.filter(v => [nm(v), v.email, v.city, v.role, v.bio].some(f => (f || '').toLowerCase().includes(q)));
    return result.sort((a, b) => this.volunteerSortOrder === 'asc' ? nm(a).localeCompare(nm(b)) : nm(b).localeCompare(nm(a)));
  }

  approveVolunteer(id: string): void {
    this.act(this.http.put(`${API}/admin/volunteers/${id}/approve`, {}), 'Volunteer approved successfully!', 'Failed to approve volunteer.');
  }

  rejectVolunteer(id: string): void {
    if (!confirm('Are you sure you want to reject and remove this volunteer request?')) return;
    this.pendingVolunteers = this.pendingVolunteers.filter(v => v.id !== id);
    this.cdr.detectChanges();
    alert('Volunteer request rejected.');
    this.http.delete(`${API}/admin/volunteers/${id}`).subscribe({ error: () => {} });
  }

  approveCampaign(id: string): void {
    this.act(this.http.put<any>(`${API}/admin/campaigns/${id}/approve`, {}), undefined, 'Failed to approve campaign.', res => {
      alert(res?.status === 'pending_bank_details'
        ? 'Campaign approved — it will go live once bank details are added for it.'
        : 'Campaign approved and published to donor feed!');
      this.loadAdminData();
    });
  }

  rejectCampaign(id: string): void {
    if (!confirm('Are you sure you want to reject and remove this campaign request?')) return;
    this.pendingCampaigns = this.pendingCampaigns.filter(c => c.id !== id);
    this.cdr.detectChanges();
    alert('Campaign request rejected.');
    this.http.delete(`${API}/campaigns/${id}`).subscribe({
      error: () => this.http.delete(`${API}/admin/campaigns/${id}`).subscribe({ error: () => {} })
    });
  }

  openImageModal(url: string, title?: string): void {
    this.imageModalUrl = url;
    this.imageModalTitle = title || 'Image Preview';
  }

  closeImageModal(): void {
    this.imageModalUrl = null;
    this.imageModalTitle = null;
  }

  private deleteItem(camp: any, key: string, index: number, what: string, kind: string): void {
    if (!confirm(`Are you sure you want to delete this ${what}?`)) return;
    const updated = [...camp[key]];
    updated.splice(index, 1);
    this.act(
      this.http.put(`${API}/admin/campaigns/${camp.id}`, { ...camp, [key]: updated }),
      `${what[0].toUpperCase() + what.slice(1)} deleted successfully!`, `Could not delete ${kind}. Please try again.`,
      () => {
        camp[key] = updated;
        if (this.selectedCampaignModal) this.selectedCampaignModal[key] = updated;
        this.cdr.detectChanges();
      }
    );
  }

  deleteProgressImage(campaign: any, imageIndex: number): void {
    this.deleteItem(campaign, 'additional_images', imageIndex, 'progress photo', 'image');
  }

  deleteDocumentProof(campaign: any, docIndex: number): void {
    this.deleteItem(campaign, 'document_proofs', docIndex, 'document proof', 'document');
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0] ?? this.selectedFile;
  }

  onAdditionalFilesSelected(event: any): void {
    const files = event.target.files;
    if (files) this.selectedAdditionalFiles = [...this.selectedAdditionalFiles, ...(Array.from(files) as File[]).slice(0, 10 - this.selectedAdditionalFiles.length)];
  }

  removeAdditionalFile(index: number): void {
    this.selectedAdditionalFiles.splice(index, 1);
  }

  onDocumentProofsSelected(event: any): void {
    const files = event.target.files;
    if (files) this.selectedDocumentProofs = [...this.selectedDocumentProofs, ...(Array.from(files) as File[])];
  }

  removeDocumentProofFile(index: number): void {
    this.selectedDocumentProofs.splice(index, 1);
  }

  onCreateQrCodeSelected(event: any): void {
    this.selectedQrCodeFile = event.target.files[0] ?? this.selectedQrCodeFile;
  }

  onPhotoUploadSelected(event: any, campaignId: string): void {
    const file = event.target.files[0];
    if (file) this.act(this.http.post(`${API}/campaigns/${campaignId}/upload-photo`, this.form('file', [file])), 'Campaign cover photo updated successfully!');
  }

  onQrCodeUploadSelected(event: any, campaignId: string): void {
    const file = event.target.files[0];
    if (!file) return;
    this.act(this.http.post<any>(`${API}/campaigns/${campaignId}/upload-qr-code`, this.form('file', [file])), 'UPI QR Code uploaded successfully!', 'Failed to upload QR code image.', res => {
      if (res.upi_qr_code_url && this.selectedCampaignModal) this.selectedCampaignModal.upi_qr_code_url = res.upi_qr_code_url;
      this.loadAdminData();
    });
  }

  onGalleryUploadSelected(event: any, campaignId: string): void {
    const files = event.target.files;
    if (files) this.act(this.http.post(`${API}/campaigns/${campaignId}/upload-gallery`, this.form('files', files)), 'Gallery photos added successfully!');
  }

  onDocumentUploadSelected(event: any, campaignId: string): void {
    const files = event.target.files;
    if (files) this.act(this.http.post(`${API}/campaigns/${campaignId}/upload-documents`, this.form('documents', files)), 'PDF document proofs uploaded successfully!');
  }

  createCampaign(): void {
    const p = localStorage.getItem('user_profile');
    if (!p) return;
    const n = this.newCampaign;
    if (!this.selectedFile || !n.title || !n.goal) {
      alert('Please fill out all required campaign fields and select a primary image file.');
      return;
    }
    if (!n.category) {
      alert('Please select a category for this campaign.');
      return;
    }
    if (!n.information?.trim()) {
      alert('Please add the detailed campaign story/information — this is what donors see on the donate page.');
      return;
    }
    if (!n.end_date) {
      alert('Please set a campaign end date.');
      return;
    }
    this.creatingCampaign = true;
    const fd = new FormData();
    (['title', 'location', 'description', 'category', 'information', 'end_date', 'bank_account_name', 'bank_account_number', 'bank_ifsc_code', 'bank_name', 'upi_id'] as const)
      .forEach(k => fd.append(k, n[k] || ''));
    fd.append('goal', n.goal.toString());
    fd.append('user_email', JSON.parse(p).email);
    fd.append('file', this.selectedFile, this.selectedFile.name);
    if (this.selectedQrCodeFile) fd.append('upi_qr_code', this.selectedQrCodeFile, this.selectedQrCodeFile.name);
    this.selectedAdditionalFiles.forEach(f => fd.append('additional_files', f, f.name));
    this.selectedDocumentProofs.forEach(f => fd.append('verification_docs', f, f.name));
    this.http.post(`${API}/campaigns`, fd).subscribe({
      next: () => {
        this.creatingCampaign = false;
        alert('Campaign created successfully!');
        this.loadAdminData();
        this.newCampaign = this.emptyCampaign();
        this.selectedFile = null;
        this.selectedQrCodeFile = null;
        this.selectedAdditionalFiles = [];
        this.selectedDocumentProofs = [];
        this.showCreateCampaignForm = false;
      },
      error: err => {
        this.creatingCampaign = false;
        console.error('Error creating campaign', err);
        alert(err.error?.detail || 'Failed to create campaign.');
      }
    });
  }

  saveCampaignEdit(camp: any): void {
    this.act(this.http.put(`${API}/admin/campaigns/${camp.id}`, camp), 'Campaign updated successfully!');
  }

  // saves immediately when a category is picked from the dropdown
  updateCampaignCategory(camp: any): void {
    this.act(this.http.put(`${API}/admin/campaigns/${camp.id}`, { category: camp.category }), undefined, 'Failed to update category. Please try again.', () => {
      if (this.selectedCampaignModal?.id === camp.id) this.selectedCampaignModal.category = camp.category;
      const cached = this.allCamps.find(c => c.id === camp.id);
      if (cached) cached.category = camp.category;
      this.cdr.detectChanges();
    });
  }

  saveCampaignBankDetails(camp: any): void {
    const payload = Object.fromEntries(this.bankKeys.map(k => [k, camp[k]]));
    this.act(this.http.put(`${API}/admin/campaigns/${camp.id}`, payload), 'Bank and UPI details updated successfully!', 'Failed to update bank details.');
  }

  deleteCampaignBankDetails(camp: any): void {
    if (!confirm('Are you sure you want to delete all bank and UPI details (including QR code) for this campaign?')) return;
    const payload = Object.fromEntries(this.bankKeys.map(k => [k, null]));
    this.act(this.http.put(`${API}/admin/campaigns/${camp.id}`, payload), 'Bank and UPI details deleted successfully!', 'Failed to delete bank details.', () => {
      const modal = this.selectedCampaignModal?.id === camp.id ? this.selectedCampaignModal : null;
      this.bankKeys.forEach(k => {
        camp[k] = null;
        if (modal) modal[k] = null;
      });
      this.loadAdminData();
    });
  }

  updateCampaignFunds(camp: any): void {
    this.act(this.http.put(`${API}/admin/campaigns/${camp.id}`, { raised: camp.raised_input }), 'Raised funds updated successfully!');
  }

  deleteCampaign(id: string): void {
    if (confirm('Are you sure you want to delete this campaign?')) this.act(this.http.delete(`${API}/campaigns/${id}`));
  }

  createVolunteer(): void {
    const v = this.newVolunteer;
    if (!v.name || !v.email || !v.password) {
      alert('Please fill out all required volunteer fields (Name, Email, Password).');
      return;
    }
    this.creatingVolunteer = true;
    this.http.post(`${API}/admin/volunteers`, v).subscribe({
      next: () => {
        this.creatingVolunteer = false;
        alert('Volunteer added successfully!');
        this.loadAdminData();
        this.newVolunteer = this.emptyVolunteer();
        this.showCreateVolunteerForm = false;
      },
      error: err => {
        this.creatingVolunteer = false;
        console.error('Error adding volunteer', err);
        alert(err.error?.detail || 'Failed to add volunteer.');
      }
    });
  }

  saveVolunteerEdit(vol: any): void {
    this.act(this.http.put(`${API}/admin/volunteers/${vol.id}`, { ...vol, name: vol.name || vol.full_name }), 'Volunteer updated successfully!');
  }

  deleteVolunteer(id: string): void {
    if (confirm('Are you sure you want to delete this volunteer?')) this.act(this.http.delete(`${API}/admin/volunteers/${id}`));
  }
}