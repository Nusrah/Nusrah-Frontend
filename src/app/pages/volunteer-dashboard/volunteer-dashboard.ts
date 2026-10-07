import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

const API = 'http://127.0.0.1:8000/api';
const emptyCampaign = () => ({ title: '', location: '', description: '', goal: 0, category: '', information: '', end_date: '', bank_account_name: '', bank_account_number: '', bank_ifsc_code: '', bank_name: '', upi_id: '' });
const toArray = (v: any): any[] => {
  if (typeof v === 'string') { try { v = JSON.parse(v); } catch { v = []; } }
  return Array.isArray(v) ? v : [];
};

@Component({
  selector: 'app-volunteer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './volunteer-dashboard.html'
})
export class VolunteerDashboardComponent implements OnInit {
  campaigns: any[] = [];
  assignedCampaignIds: string[] = [];
  loading = true;
  creatingCampaign = false;
  activeTab: 'profile' | 'campaigns' = 'profile';
  isEditingProfile = false;
  mobileMenuOpen = false;
  volunteerProfile: any = { name: '', email: '', phone: '', city: '', bio: '', photo_url: '' };
  updatingProfile = false;
  categories: string[] = ['Masjid Construction', 'Medical Aid', 'Education', 'Orphan Care', 'Widow & Family Support', 'Food & Ration Aid', 'Water Wells', 'Disaster Relief', 'Qurbani / Udhiya', 'Zakat & Sadaqah', 'Islamic Da\'wah', 'General / Other'];
  newCampaign = emptyCampaign();
  selectedFile: File | null = null;
  selectedQrCodeFile: File | null = null;
  selectedAdditionalFiles: File[] = [];
  selectedVerificationDocs: File[] = [];
  selectedCampaignModal: any = null;
  selectedImageView: string | null = null;
  selectedImageTitle: string | null = null;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit(): void {
    const profileJson = localStorage.getItem('user_profile');
    if (!profileJson) {
      alert('Please log in.');
      this.router.navigate(['/login']);
      return;
    }
    const profile = JSON.parse(profileJson);
    if (profile.role?.toLowerCase() !== 'volunteer') {
      alert('Access denied. Volunteers only.');
      this.router.navigate(['/']);
      return;
    }
    this.volunteerProfile = { ...profile, name: profile.name || profile.full_name };
    this.fetchLatestProfile(profile.id || profile.email);
    this.loadCampaigns();
  }

  private setProfile(d: any): void {
    this.volunteerProfile = { ...d, name: d.name || d.full_name || d.username || this.volunteerProfile.name };
    localStorage.setItem('user_profile', JSON.stringify(this.volunteerProfile));
  }

  logout(): void {
    localStorage.removeItem('user_profile');
    localStorage.removeItem('token');
    this.router.navigate(['/']);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  setActiveTab(tab: 'profile' | 'campaigns'): void {
    this.activeTab = tab;
    this.mobileMenuOpen = false;
  }

  fetchLatestProfile(identifier: string): void {
    this.http.get<any>(`${API}/volunteers/profile?identifier=${identifier}`).subscribe({
      next: res => {
        if (res?.profile) {
          this.setProfile(res.profile);
          this.cdr.detectChanges();
        }
      },
      error: () => console.log('Using local profile session data')
    });
  }

  toggleEditProfile(): void {
    this.isEditingProfile = !this.isEditingProfile;
  }

  updateVolunteerProfile(): void {
    this.updatingProfile = true;
    const id = this.volunteerProfile.id;
    this.http.put(id ? `${API}/admin/volunteers/${id}` : `${API}/volunteers/profile`, { ...this.volunteerProfile, full_name: this.volunteerProfile.name }).subscribe({
      next: (res: any) => {
        this.updatingProfile = false;
        this.isEditingProfile = false;
        alert('Profile updated successfully!');
        if (res) this.setProfile(res.volunteer?.[0] || res.profile || res);
        this.cdr.detectChanges();
      },
      error: err => {
        this.updatingProfile = false;
        console.error('Failed to update profile', err);
        alert(err.error?.detail || 'Could not update profile. Please try again.');
      }
    });
  }

  onVolunteerPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file, file.name);
    const id = this.volunteerProfile.id;
    this.http.post(id ? `${API}/admin/volunteers/${id}/upload-photo` : `${API}/volunteers/upload-photo`, formData).subscribe({
      next: (res: any) => {
        alert('Profile photo updated successfully!');
        if (res?.photo_url) {
          this.volunteerProfile.photo_url = res.photo_url;
          localStorage.setItem('user_profile', JSON.stringify(this.volunteerProfile));
        }
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Failed to upload profile photo', err);
        alert('Could not upload profile photo.');
      }
    });
  }

  loadCampaigns(): void {
    this.http.get<any>(`${API}/admin/campaigns`).subscribe({
      next: res => {
        this.campaigns = (res.campaigns || res).map((c: any) => ({
          ...c,
          additional_images: toArray(c.additional_images),
          verification_docs: toArray(c.verification_docs || c.document_proofs)
        }));
        if (this.selectedCampaignModal) {
          const updated = this.campaigns.find(c => c.id === this.selectedCampaignModal.id);
          if (updated) this.selectedCampaignModal = { ...updated };
        }
        this.loading = false;
        this.loadVolunteerAssignments();
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Error loading campaigns', err);
        this.loading = false;
      }
    });
  }

  loadVolunteerAssignments(): void {
    if (!this.volunteerProfile?.id) return;
    this.http.get<any>(`${API}/volunteers/${this.volunteerProfile.id}/campaigns`).subscribe({
      next: res => {
        const list = res.campaigns || res;
        if (Array.isArray(list)) {
          this.assignedCampaignIds = list.map((c: any) => c.id || c);
          this.cdr.detectChanges();
        }
      },
      error: () => (this.assignedCampaignIds = [])
    });
  }

  get assignedCampaigns(): any[] {
    return this.campaigns.filter(c => this.assignedCampaignIds.includes(c.id) || c.user_id === this.volunteerProfile.id);
  }

  get myNeedsBankDetailsCampaigns(): any[] {
    return this.campaigns.filter(c => c.status === 'pending_bank_details' && c.user_id === this.volunteerProfile.id);
  }

  openCampaignManageModal(campaign: any): void {
    this.selectedCampaignModal = { ...campaign };
  }

  closeCampaignManageModal(): void {
    this.selectedCampaignModal = null;
    this.loadCampaigns();
  }

  calcPercentage(raised: number, goal: number): number {
    return !goal || goal <= 0 ? 0 : Math.min(100, ((raised || 0) / goal) * 100);
  }

  deleteProgressImage(campaign: any, imageIndex: number): void {
    if (!confirm('Are you sure you want to delete this progress photo?')) return;
    const updatedImages = campaign.additional_images.filter((_: any, i: number) => i !== imageIndex);
    this.http.put(`${API}/admin/campaigns/${campaign.id}`, { ...campaign, additional_images: updatedImages }).subscribe({
      next: () => {
        campaign.additional_images = updatedImages;
        if (this.selectedCampaignModal) this.selectedCampaignModal.additional_images = updatedImages;
        alert('Progress photo deleted successfully!');
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Failed to delete image', err);
        alert('Could not delete image. Please try again.');
      }
    });
  }

  deleteVerificationDoc(campaign: any, docIndex: number): void {
    if (!confirm('Are you sure you want to delete this verification document?')) return;
    this.http.post(`${API}/campaigns/${campaign.id}/delete-verification-doc`, { file_url: campaign.verification_docs[docIndex] }).subscribe({
      next: (res: any) => {
        const updatedDocs = res.verification_docs || campaign.verification_docs.filter((_: any, i: number) => i !== docIndex);
        campaign.verification_docs = updatedDocs;
        if (this.selectedCampaignModal) this.selectedCampaignModal.verification_docs = updatedDocs;
        alert('Verification document deleted successfully!');
        this.loadCampaigns();
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Failed to delete document', err);
        alert(err.error?.detail || 'Could not delete document. Please try again.');
      }
    });
  }

  onFileSelected(event: any): void {
    this.selectedFile = event.target.files[0] || this.selectedFile;
  }

  onAdditionalFilesSelected(event: any): void {
    const files = event.target.files;
    if (files) this.selectedAdditionalFiles = [...this.selectedAdditionalFiles, ...Array.from<File>(files).slice(0, 10 - this.selectedAdditionalFiles.length)];
  }

  removeAdditionalFile(index: number): void {
    this.selectedAdditionalFiles.splice(index, 1);
  }

  onVerificationDocsSelected(event: any): void {
    const files = event.target.files;
    if (files) this.selectedVerificationDocs = [...this.selectedVerificationDocs, ...Array.from<File>(files)];
  }

  removeVerificationDoc(index: number): void {
    this.selectedVerificationDocs.splice(index, 1);
  }

  onCreateQrCodeSelected(event: any): void {
    this.selectedQrCodeFile = event.target.files[0] || this.selectedQrCodeFile;
  }

  fillSampleCampaignData(): void {
    this.newCampaign = {
      ...emptyCampaign(),
      title: 'Community Clean-up & Tree Plantation Drive',
      location: 'Anantapur Central Park',
      description: 'Join hands to clean up local public spaces and plant 500 saplings to promote green living and environmental sustainability.',
      goal: 50000,
      category: 'General / Other',
      information: 'This initiative brings together local volunteers to restore public green spaces that have fallen into neglect. Over the course of the drive, we will clear litter and overgrowth from the park, prepare the soil, and plant 500 native saplings selected for the local climate. Funds raised will cover saplings, basic gardening tools, protective fencing for young plants, and refreshments for volunteer teams. Regular watering and upkeep will be coordinated with the local municipal body for the following six months.'
    };
  }

  onPhotoUploadSelected(event: any, campaignId: string): void {
    const file = event.target.files[0];
    if (file) this.uploadProgressPhoto(campaignId, file);
  }

  private uploadFiles(event: any, campaignId: string, path: string, field: string, okMsg: string, errMsg: string): void {
    const files = event.target.files;
    if (!files) return;
    const formData = new FormData();
    Array.from<File>(files).forEach(f => formData.append(field, f, f.name));
    this.http.post(`${API}/campaigns/${campaignId}/${path}`, formData).subscribe({
      next: () => {
        alert(okMsg);
        this.loadCampaigns();
      },
      error: err => console.error(errMsg, err)
    });
  }

  onGalleryUploadSelected(event: any, campaignId: string): void {
    this.uploadFiles(event, campaignId, 'upload-gallery', 'files', 'Gallery photos added successfully!', 'Failed to upload gallery images');
  }

  onVerificationDocsUploadSelected(event: any, campaignId: string): void {
    this.uploadFiles(event, campaignId, 'upload-verification-docs', 'verification_docs', 'Verification documents uploaded successfully!', 'Failed to upload verification documents');
  }

  createCampaign(): void {
    const profileJson = localStorage.getItem('user_profile');
    if (!profileJson) return;
    const profile = JSON.parse(profileJson);
    const n = this.newCampaign;

    if (!this.selectedFile || !n.title || !n.goal) return alert('Please fill out all fields and choose a primary campaign image.');
    if (!n.category) return alert('Please select a category for this campaign.');
    if (!n.information?.trim()) return alert('Please add the detailed campaign story/information — this is what donors will see on the donate page.');
    if (!n.end_date) return alert('Please set a campaign end date.');

    this.creatingCampaign = true;
    const formData = new FormData();
    (Object.keys(n) as (keyof typeof n)[]).forEach(k => formData.append(k, String(n[k] || (k === 'goal' ? 0 : ''))));
    formData.append('user_email', profile.email);
    formData.append('file', this.selectedFile, this.selectedFile.name);
    if (this.selectedQrCodeFile) formData.append('upi_qr_code', this.selectedQrCodeFile, this.selectedQrCodeFile.name);
    this.selectedAdditionalFiles.forEach(f => formData.append('additional_files', f, f.name));
    this.selectedVerificationDocs.forEach(f => formData.append('verification_docs', f, f.name));

    this.http.post(`${API}/campaigns`, formData).subscribe({
      next: () => {
        this.creatingCampaign = false;
        alert('Campaign submitted successfully! Waiting for admin approval to go live.');
        this.loadCampaigns();
        this.newCampaign = emptyCampaign();
        this.selectedFile = this.selectedQrCodeFile = null;
        this.selectedAdditionalFiles = [];
        this.selectedVerificationDocs = [];
      },
      error: err => {
        this.creatingCampaign = false;
        console.error('Error submitting campaign', err);
        alert(err.error?.detail || 'Failed to submit campaign.');
      }
    });
  }

  saveCampaignEdit(camp: any): void {
    this.http.put(`${API}/admin/campaigns/${camp.id}`, camp).subscribe({
      next: () => {
        alert('Campaign details updated successfully!');
        this.loadCampaigns();
      },
      error: err => console.error('Error updating campaign', err)
    });
  }

  saveCampaignBankDetails(camp: any): void {
    const { bank_account_name, bank_account_number, bank_ifsc_code, bank_name, upi_id } = camp;
    this.http.put<any>(`${API}/admin/campaigns/${camp.id}`, { bank_account_name, bank_account_number, bank_ifsc_code, bank_name, upi_id }).subscribe({
      next: res => {
        alert(res?.campaign?.[0]?.status === 'active' ? 'Bank details saved — this campaign is now live for donors!' : 'Bank details saved successfully!');
        this.loadCampaigns();
      },
      error: err => {
        console.error('Error saving bank details', err);
        alert(err.error?.detail || 'Failed to save bank details. Please try again.');
      }
    });
  }

  updateCampaignCategory(camp: any): void {
    this.http.put(`${API}/admin/campaigns/${camp.id}`, { category: camp.category }).subscribe({
      next: () => {
        if (this.selectedCampaignModal?.id === camp.id) this.selectedCampaignModal.category = camp.category;
        const cached = this.campaigns.find(c => c.id === camp.id);
        if (cached) cached.category = camp.category;
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Error updating category', err);
        alert('Failed to update category. Please try again.');
      }
    });
  }

  updateProgress(campaign: any): void {
    this.http.put(`${API}/campaigns/${campaign.id}/progress`, { raised: Number(campaign.raised) }).subscribe({
      next: () => {
        alert('Campaign raised amount updated successfully!');
        this.loadCampaigns();
      },
      error: err => console.error('Failed to update progress', err)
    });
  }

  uploadProgressPhoto(campaignId: string, file: File): void {
    const formData = new FormData();
    formData.append('file', file, file.name);
    this.http.post(`${API}/campaigns/${campaignId}/upload-photo`, formData).subscribe({
      next: () => {
        alert('Campaign cover photo updated successfully!');
        this.loadCampaigns();
      },
      error: err => console.error('Failed to upload photo', err)
    });
  }

  openImageView(url: string, title?: string): void {
    if (!url) return;
    this.selectedImageView = url;
    this.selectedImageTitle = title || 'Image Preview';
    this.cdr.detectChanges();
  }

  closeImageView(): void {
    this.selectedImageView = this.selectedImageTitle = null;
  }
}