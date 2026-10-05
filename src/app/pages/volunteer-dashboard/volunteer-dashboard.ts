import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-volunteer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './volunteer-dashboard.html',
  styleUrls: ['./volunteer-dashboard.scss']
})
export class VolunteerDashboardComponent implements OnInit {
  campaigns: any[] = [];
  assignedCampaignIds: string[] = [];
  loading = true;
  creatingCampaign = false;

  activeTab: 'profile' | 'campaigns' = 'profile';
  isEditingProfile = false;
  mobileMenuOpen = false;

  volunteerProfile: any = {
    name: '',
    email: '',
    phone: '',
    city: '',
    bio: '',
    photo_url: ''
  };
  updatingProfile = false;

  // Category options shown in the create-campaign dropdown and the
  // manage-campaign modal's category selector.
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

  newCampaign = {
    title: '',
    location: '',
    description: '',
    goal: 0,
    category: '',
    information: '',
    end_date: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_name: '',
    upi_id: ''
  };
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
    if (profileJson) {
      const profile = JSON.parse(profileJson);
      if (profile.role?.toLowerCase() !== 'volunteer') {
        alert('Access denied. Volunteers only.');
        this.router.navigate(['/']);
        return;
      }
      this.volunteerProfile = { ...profile, name: profile.name || profile.full_name };
      this.fetchLatestProfile(profile.id || profile.email);
    } else {
      alert('Please log in.');
      this.router.navigate(['/login']);
      return;
    }

    this.loadCampaigns();
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
    this.http.get<any>(`http://127.0.0.1:8000/api/volunteers/profile?identifier=${identifier}`).subscribe({
      next: (res) => {
        if (res && res.profile) {
          const profileData = res.profile;
          this.volunteerProfile = {
            ...profileData,
            name: profileData.name || profileData.full_name || profileData.username || this.volunteerProfile.name
          };
          localStorage.setItem('user_profile', JSON.stringify(this.volunteerProfile));
          this.cdr.detectChanges();
        }
      },
      error: () => {
        console.log('Using local profile session data');
      }
    });
  }

  toggleEditProfile(): void {
    this.isEditingProfile = !this.isEditingProfile;
  }

  updateVolunteerProfile(): void {
    this.updatingProfile = true;
    const payload = {
      ...this.volunteerProfile,
      full_name: this.volunteerProfile.name
    };

    const volunteerId = this.volunteerProfile.id;
    const endpoint = volunteerId 
      ? `http://127.0.0.1:8000/api/admin/volunteers/${volunteerId}` 
      : `http://127.0.0.1:8000/api/volunteers/profile`;

    this.http.put(endpoint, payload).subscribe({
      next: (res: any) => {
        this.updatingProfile = false;
        this.isEditingProfile = false;
        alert('Profile updated successfully!');
        if (res) {
          const updatedData = res.volunteer?.[0] || res.profile || res;
          this.volunteerProfile = { 
            ...updatedData, 
            name: updatedData.name || updatedData.full_name || updatedData.username || this.volunteerProfile.name 
          };
          localStorage.setItem('user_profile', JSON.stringify(this.volunteerProfile));
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.updatingProfile = false;
        console.error('Failed to update profile', err);
        alert(err.error?.detail || 'Could not update profile. Please try again.');
      }
    });
  }

  onVolunteerPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const formData = new FormData();
      formData.append('file', file, file.name);

      const volunteerId = this.volunteerProfile.id;
      const endpoint = volunteerId 
        ? `http://127.0.0.1:8000/api/admin/volunteers/${volunteerId}/upload-photo`
        : `http://127.0.0.1:8000/api/volunteers/upload-photo`;

      this.http.post(endpoint, formData).subscribe({
        next: (res: any) => {
          alert('Profile photo updated successfully!');
          if (res && res.photo_url) {
            this.volunteerProfile.photo_url = res.photo_url;
            localStorage.setItem('user_profile', JSON.stringify(this.volunteerProfile));
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to upload profile photo', err);
          alert('Could not upload profile photo.');
        }
      });
    }
  }

  loadCampaigns(): void {
    this.http.get<any>('http://127.0.0.1:8000/api/campaigns').subscribe({
      next: (res) => {
        const rawCampaigns = res.campaigns || res;
        this.campaigns = rawCampaigns.map((c: any) => {
          let parsedImages = c.additional_images;
          if (typeof parsedImages === 'string') {
            try {
              parsedImages = JSON.parse(parsedImages);
            } catch (e) {
              parsedImages = [];
            }
          }

          let parsedDocs = c.verification_docs || c.document_proofs;
          if (typeof parsedDocs === 'string') {
            try {
              parsedDocs = JSON.parse(parsedDocs);
            } catch (e) {
              parsedDocs = [];
            }
          }

          return {
            ...c,
            additional_images: Array.isArray(parsedImages) ? parsedImages : [],
            verification_docs: Array.isArray(parsedDocs) ? parsedDocs : []
          };
        });

        if (this.selectedCampaignModal) {
          const updated = this.campaigns.find(c => c.id === this.selectedCampaignModal.id);
          if (updated) this.selectedCampaignModal = { ...updated };
        }

        this.loading = false;
        this.loadVolunteerAssignments();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading campaigns', err);
        this.loading = false;
      }
    });
  }

  loadVolunteerAssignments(): void {
    if (!this.volunteerProfile?.id) return;
    this.http.get<any>(`http://127.0.0.1:8000/api/volunteers/${this.volunteerProfile.id}/campaigns`).subscribe({
      next: (res) => {
        const assignedList = res.campaigns || res;
        if (Array.isArray(assignedList)) {
          this.assignedCampaignIds = assignedList.map((c: any) => c.id || c);
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.assignedCampaignIds = [];
      }
    });
  }

  get assignedCampaigns(): any[] {
    return this.campaigns.filter(c => 
      this.assignedCampaignIds.includes(c.id) || 
      c.user_email === this.volunteerProfile.email
    );
  }

  openCampaignManageModal(campaign: any): void {
    this.selectedCampaignModal = { ...campaign };
  }

  closeCampaignManageModal(): void {
    this.selectedCampaignModal = null;
    this.loadCampaigns();
  }

  calcPercentage(raised: number, goal: number): number {
    if (!goal || goal <= 0) return 0;
    const pct = ((raised || 0) / goal) * 100;
    return pct > 100 ? 100 : pct;
  }

  deleteProgressImage(campaign: any, imageIndex: number): void {
    if (!confirm('Are you sure you want to delete this progress photo?')) return;

    const updatedImages = [...campaign.additional_images];
    updatedImages.splice(imageIndex, 1);

    const payload = {
      ...campaign,
      additional_images: updatedImages
    };

    this.http.put(`http://127.0.0.1:8000/api/admin/campaigns/${campaign.id}`, payload).subscribe({
      next: () => {
        campaign.additional_images = updatedImages;
        if (this.selectedCampaignModal) {
          this.selectedCampaignModal.additional_images = updatedImages;
        }
        alert('Progress photo deleted successfully!');
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to delete image', err);
        alert('Could not delete image. Please try again.');
      }
    });
  }

  deleteVerificationDoc(campaign: any, docIndex: number): void {
    if (!confirm('Are you sure you want to delete this verification document?')) return;

    const targetDocUrl = campaign.verification_docs[docIndex];

    this.http.post(`http://127.0.0.1:8000/api/campaigns/${campaign.id}/delete-verification-doc`, {
      file_url: targetDocUrl
    }).subscribe({
      next: (res: any) => {
        const updatedDocs = res.verification_docs || campaign.verification_docs.filter((_: any, i: number) => i !== docIndex);
        campaign.verification_docs = updatedDocs;
        if (this.selectedCampaignModal) {
          this.selectedCampaignModal.verification_docs = updatedDocs;
        }
        alert('Verification document deleted successfully!');
        this.loadCampaigns();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to delete document', err);
        alert(err.error?.detail || 'Could not delete document. Please try again.');
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onAdditionalFilesSelected(event: any): void {
    const files = event.target.files;
    if (files) {
      const remainingSlots = 10 - this.selectedAdditionalFiles.length;
      const filesToAdd = Array.from(files).slice(0, remainingSlots);
      this.selectedAdditionalFiles = [...this.selectedAdditionalFiles, ...filesToAdd] as File[];
    }
  }

  removeAdditionalFile(index: number): void {
    this.selectedAdditionalFiles.splice(index, 1);
  }

  onVerificationDocsSelected(event: any): void {
    const files = event.target.files;
    if (files) {
      const filesToAdd = Array.from(files);
      this.selectedVerificationDocs = [...this.selectedVerificationDocs, ...filesToAdd] as File[];
    }
  }

  removeVerificationDoc(index: number): void {
    this.selectedVerificationDocs.splice(index, 1);
  }

  onCreateQrCodeSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedQrCodeFile = file;
    }
  }

  fillSampleCampaignData(): void {
    this.newCampaign = {
      title: 'Community Clean-up & Tree Plantation Drive',
      location: 'Anantapur Central Park',
      description: 'Join hands to clean up local public spaces and plant 500 saplings to promote green living and environmental sustainability.',
      goal: 50000,
      category: 'General / Other',
      information: 'This initiative brings together local volunteers to restore public green spaces that have fallen into neglect. Over the course of the drive, we will clear litter and overgrowth from the park, prepare the soil, and plant 500 native saplings selected for the local climate. Funds raised will cover saplings, basic gardening tools, protective fencing for young plants, and refreshments for volunteer teams. Regular watering and upkeep will be coordinated with the local municipal body for the following six months.',
      end_date: '',
      bank_account_name: '',
      bank_account_number: '',
      bank_ifsc_code: '',
      bank_name: '',
      upi_id: ''
    };
  }

  onPhotoUploadSelected(event: any, campaignId: string): void {
    const file = event.target.files[0];
    if (file) {
      this.uploadProgressPhoto(campaignId, file);
    }
  }

  onGalleryUploadSelected(event: any, campaignId: string): void {
    const files = event.target.files;
    if (files) {
      const formData = new FormData();
      Array.from(files).forEach((file: any) => {
        formData.append('files', file, file.name);
      });

      this.http.post(`http://127.0.0.1:8000/api/campaigns/${campaignId}/upload-gallery`, formData).subscribe({
        next: () => {
          alert('Gallery photos added successfully!');
          this.loadCampaigns();
        },
        error: (err) => console.error('Failed to upload gallery images', err)
      });
    }
  }

  onVerificationDocsUploadSelected(event: any, campaignId: string): void {
    const files = event.target.files;
    if (files) {
      const formData = new FormData();
      Array.from(files).forEach((file: any) => {
        formData.append('verification_docs', file, file.name);
      });

      this.http.post(`http://127.0.0.1:8000/api/campaigns/${campaignId}/upload-verification-docs`, formData).subscribe({
        next: () => {
          alert('Verification documents uploaded successfully!');
          this.loadCampaigns();
        },
        error: (err) => console.error('Failed to upload verification documents', err)
      });
    }
  }

  createCampaign(): void {
    const profileJson = localStorage.getItem('user_profile');
    if (!profileJson) return;
    const profile = JSON.parse(profileJson);

    if (!this.selectedFile || !this.newCampaign.title || !this.newCampaign.goal) {
      alert('Please fill out all fields and choose a primary campaign image.');
      return;
    }

    if (!this.newCampaign.category) {
      alert('Please select a category for this campaign.');
      return;
    }

    if (!this.newCampaign.information || !this.newCampaign.information.trim()) {
      alert('Please add the detailed campaign story/information — this is what donors will see on the donate page.');
      return;
    }

    if (!this.newCampaign.end_date) {
      alert('Please set a campaign end date.');
      return;
    }

    this.creatingCampaign = true;
    const formData = new FormData();
    formData.append('title', this.newCampaign.title);
    formData.append('location', this.newCampaign.location);
    formData.append('description', this.newCampaign.description);
    formData.append('goal', this.newCampaign.goal.toString());
    formData.append('user_email', profile.email);
    formData.append('file', this.selectedFile, this.selectedFile.name);
    formData.append('category', this.newCampaign.category || '');
    formData.append('information', this.newCampaign.information || '');
    formData.append('end_date', this.newCampaign.end_date || '');
    formData.append('bank_account_name', this.newCampaign.bank_account_name || '');
    formData.append('bank_account_number', this.newCampaign.bank_account_number || '');
    formData.append('bank_ifsc_code', this.newCampaign.bank_ifsc_code || '');
    formData.append('bank_name', this.newCampaign.bank_name || '');
    formData.append('upi_id', this.newCampaign.upi_id || '');

    if (this.selectedQrCodeFile) {
      formData.append('upi_qr_code', this.selectedQrCodeFile, this.selectedQrCodeFile.name);
    }

    this.selectedAdditionalFiles.forEach((file) => {
      formData.append('additional_files', file, file.name);
    });

    this.selectedVerificationDocs.forEach((file) => {
      formData.append('verification_docs', file, file.name);
    });

    this.http.post('http://127.0.0.1:8000/api/campaigns', formData).subscribe({
      next: () => {
        this.creatingCampaign = false;
        alert('Campaign submitted successfully! Waiting for admin approval to go live.');
        this.loadCampaigns();
        this.newCampaign = {
          title: '', location: '', description: '', goal: 0, category: '',
          information: '', end_date: '', bank_account_name: '', bank_account_number: '',
          bank_ifsc_code: '', bank_name: '', upi_id: ''
        };
        this.selectedFile = null;
        this.selectedQrCodeFile = null;
        this.selectedAdditionalFiles = [];
        this.selectedVerificationDocs = [];
      },
      error: (err) => {
        this.creatingCampaign = false;
        console.error('Error submitting campaign', err);
        alert(err.error?.detail || 'Failed to submit campaign.');
      }
    });
  }

  saveCampaignEdit(camp: any): void {
    this.http.put(`http://127.0.0.1:8000/api/admin/campaigns/${camp.id}`, camp).subscribe({
      next: () => {
        alert('Campaign details updated successfully!');
        this.loadCampaigns();
      },
      error: (err) => console.error('Error updating campaign', err)
    });
  }

  // Saves the category the moment it's picked from the dropdown, instead of
  // waiting for "Save Text Details" — a dropdown selection reads as a
  // committed choice, not a draft edit, so it should persist immediately.
  updateCampaignCategory(camp: any): void {
    this.http.put(`http://127.0.0.1:8000/api/admin/campaigns/${camp.id}`, { category: camp.category }).subscribe({
      next: () => {
        if (this.selectedCampaignModal && this.selectedCampaignModal.id === camp.id) {
          this.selectedCampaignModal.category = camp.category;
        }
        const cached = this.campaigns.find(c => c.id === camp.id);
        if (cached) cached.category = camp.category;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error updating category', err);
        alert('Failed to update category. Please try again.');
      }
    });
  }

  updateProgress(campaign: any): void {
    this.http.put(`http://127.0.0.1:8000/api/campaigns/${campaign.id}/progress`, {
      raised: Number(campaign.raised)
    }).subscribe({
      next: () => {
        alert('Campaign raised amount updated successfully!');
        this.loadCampaigns();
      },
      error: (err) => console.error('Failed to update progress', err)
    });
  }

  uploadProgressPhoto(campaignId: string, file: File): void {
    const formData = new FormData();
    formData.append('file', file, file.name);

    this.http.post(`http://127.0.0.1:8000/api/campaigns/${campaignId}/upload-photo`, formData).subscribe({
      next: () => {
        alert('Campaign cover photo updated successfully!');
        this.loadCampaigns();
      },
      error: (err) => console.error('Failed to upload photo', err)
    });
  }

  openImageView(url: string, title?: string): void {
    if (url) {
      this.selectedImageView = url;
      this.selectedImageTitle = title || 'Image Preview';
      this.cdr.detectChanges();
    }
  }

  closeImageView(): void {
    this.selectedImageView = null;
    this.selectedImageTitle = null;
  }
}